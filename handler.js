'use strict';
var https = require("https");
var AWS = require('aws-sdk');
AWS.config.update({region: 'ap-southeast-2'});


const { request } = require('graphql-request');
const endpoint = process.env.LA_API_ENDPOINT;

const query = /* GraphQL */
    `query getData ($em: String!) {
        getQuiz(search: verb, value: $em ) {
            course
            activity
            score
                author {
                    name
                    email
                }
            }
        }
  `;

const variables = {
    em: "completed"
};


exports.handler = async (event, context) => {

    let quizzes =  await request(endpoint, query, variables);
    let courses =  await wrangle(quizzes.getQuiz);
    let ontask  =  await updateOntask(courses);

    return ontask;

};

async function wrangle(qzs) {

    const courses = [];
    const activities = [];
    const students = [];
    const std_course = [];

    //unique activties/quizzes
    qzs.forEach( (data) => {
        if (activities.indexOf(data.activity) === -1 ) {
            activities.push(data.activity);
        }
    });

    //unique students over all courses
    qzs.forEach( (data) => {
        if (students.indexOf(data.email) === -1 ) {
            students.push(data.email);
        }
    });

    //unique courses
    qzs.forEach( (data) => {
        if (courses.indexOf(data.course) === -1 ) {
            courses.push(data.course);
        }
    });

    //get unique students per course
    let std_c = courses.map( (c) => {
        let st = qzs.reduce( (stArr, o) => {
            if(o.course === c) {
                stArr.push(o.author.email);
            }
            return stArr;
        }, []);
        let uni = [...new Set(st)];
        let act = qzs.reduce( (stArr, o) => {
            if(o.course === c && stArr.indexOf(o.activity)===-1) {
                stArr.push(o.activity);
            }
            return stArr;
        }, []);
        return {subject: c, act: act, students: uni};
    });

    let dataTable = std_c.map ((data) => {
        let grid = data.act.map( (act) => {
           let selected = qzs.filter ((r) => (data.subject === r.course && act === r.activity));
           let v = selected.map( (p) => {
               return {email: p.author.email, score: p.score};
           });
           return { activity: act, data: v};
        });
        return {subject: data.subject, grid: grid};
    });


    const dat = {};
    std_c.forEach ( (dt) => {
        const email = [];
        const activity = [];
        const score = [];

        dat.data_frame = {};
        if(dt.subject === process.env.CANVAS_COURSE_NAME) { //try and aggregate the data a particular course only
            dat.data_frame["email"]={};
            let stuCnt = dt.students.length;
            dt.act.forEach( (activity) => {
                dat.data_frame[activity] ={};
                for(let z=0; z <stuCnt; z++) {
                    dat.data_frame[activity][z] = null;
                }
            });

            let i=0;
            dt.students.forEach( (studs) => {
                dat.data_frame["email"][i] = studs;
                i++;
            });

            // start populating
            dt.act.forEach( (activity ) => {
                for(let x =0; x < stuCnt; x++ ) {
                    let student_email = dat.data_frame["email"][x];
                    let vals = qzs.filter( (r) =>{
                         if(r.author.email === student_email && r.activity === activity) {
                                return r;
                         }
                    });
                    let sr = (vals.length === 0) ? null : vals[0].score.toFixed(2);
                    dat.data_frame[activity][x]=sr;
                }
            });
        }
    });

    return dat;

}


async function updateOntask (course) {

    return new Promise((resolve, reject) => {
        const options = {
            host: process.env.ONTASK_API_HOST,
            path: '/table/'+process.env.ONTASK_WORKFLOW_ID+'/ops',
            method: 'POST',
            headers: {
                'Cache-Control': 'no-cache',
                'Authorization': 'Basic '+process.env.ONTASK_AUTH,
                'Accept': 'text/html',
                'Content-Type': 'application/json'
            }
            //body: JSON.stringify(course)
            //data: JSON.stringify(course)
        };

        const req = https.request(options, (res)  => {
            resolve('Success');
        });



        req.on('error', (error) => {
           reject(error);
        });

        req.write(JSON.stringify(course));
        req.end()
    });
}