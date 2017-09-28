# Forge-workflow-Lambda-APIGateway

To supplement the whole workflow of 2legged, I practiced with related technologies. upload local file to Forge, request model translating, and check translating status. The [blog](https://forge.autodesk.com/blog/2legged-workflow-model-translating-aws-lambda-and-api-gateway-part-i) tell more.

## Pre-requisites
1. [Nodejs](https://nodejs.org/en/download/)
2. [Amazon Web Service account](https://aws.amazon.com/).
3. [Autodesk Developer access key and secret](https://developer.autodesk.com/).

## Setup
1. Verify that you have all the pre-requisites.
2. login AWS, create a [S3 bucket](https://aws.amazon.com/s3/) in a region. e.g. in the demo, xiaodong-test-bucket in region us-east-1
3. login AWS, select [AWS API Gateway](https://aws.amazon.com/api-gateway/). Create API by [Import from Swagger]
    ![](.\help\createAPIGateway.png)
4. login AWS, select [Lambda](https://aws.amazon.com/lambda/). Create a function, do not specify trigger at the beginning. 
    * Select [node.js 6.10]
    * add neccessary enviormments variables, filling the S3 bucket name, credentials of Forge, and Forge bucket name,
     ![](.\help\createAPIGateway.png)
    * increase the timeout to 1 minute 30 seconds
     ![](.\help\createAPIGateway.png)
    * set a Swagger with S3 behavior (ObjectCreated), binding to the S3 bucket of #2
5. In [Lambda Index.js](.\Lambda\index.js#L318), set the expire time of signed URL per your requirement. 
6. open [Lambda](.\Lambda) folder, npm install the modules. Make an zip with all files in the folder. 
