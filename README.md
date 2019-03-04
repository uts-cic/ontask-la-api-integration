# ontask-la-api-integration
Pre-populate ontask workflow with Canvas data

## Node 8.10 Lambda function

This uses serverless to deploy lambda function to AWS and has all the environment variables set via serverless.yml. If you prefer thsi method create a new file serverless.yml
alternavtively this can be set via the .env file

This example fetches quizz data using la-api and then uses ontask API to populate the resp worflows

Assumptions:
- A workflow already exists in Ontask
- Canvas data already is integrated into La-api

`This code can be further extended to generate a new workflow using ontask API and then populate it but for now they are sepcified via environment variables`

Following evn variables need to be set via .env or via serverless.yml
```
LA_API_ENDPOINT: 
CANVAS_COURSE_NAME: 
ONTASK_API_HOST: 
ONTASK_AUTH: 
ONTASK_WORKFLOW_ID:
```