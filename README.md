[![oAuth2](https://img.shields.io/badge/oAuth2-v1-green.svg)](http://developer.autodesk.com/)
[![Data-Management](https://img.shields.io/badge/Data%20Management-v1-green.svg)](http://developer.autodesk.com/)
[![OSS](https://img.shields.io/badge/OSS-v2-green.svg)](http://developer.autodesk.com/)
[![Model-Derivative](https://img.shields.io/badge/Model%20Derivative-v2-green.svg)](http://developer.autodesk.com/)

# Forge-workflow-Lambda-APIGateway

To supplement the whole workflow of 2legged, I practiced with related technologies. upload local file to Forge, request model translating, and check translating status. The [blog](https://forge.autodesk.com/blog/2legged-workflow-model-translating-aws-lambda-and-api-gateway-part-i) tell more.

[![](.\help\workflow.png)]

## Pre-requisites
1. [Nodejs](https://nodejs.org/en/download/)
2. [Amazon Web Service account](https://aws.amazon.com/).
3. [Autodesk Developer access key and secret](https://developer.autodesk.com/).

## Setup
1. Verify that you have all the pre-requisites.
2. login AWS, create a [S3 bucket](https://aws.amazon.com/s3/) in a region. e.g. in the demo, xiaodong-test-bucket in region us-east-1
3. login AWS, select [AWS API Gateway](https://aws.amazon.com/api-gateway/). Create API by [Import from Swagger]
    ![image](.\help\createAPIGateway.png)
4. login AWS, select [AWS Lambda](https://aws.amazon.com/lambda/). Create a function, do not specify trigger at the beginning. 
    * Select [node.js 6.10]
    * add neccessary enviormments variables, fill in the S3 bucket name, credentials of Forge, and Forge bucket name,
     ![image](.\help\lambdaEV.png)
    * increase the timeout to 1 minute 30 seconds
     ![](.\help\timeout.png)
    * set a Swagger with S3 behavior (ObjectCreated), binding to the S3 bucket of #2
    ![](.\help\ç.png)
5. In [Lambda Index.js](.\Lambda\index.js#L318), set the expire time of signed URL per your requirement. 
6. open [Lambda](.\Lambda) folder, npm install the modules. Make an zip with [Lambda Index.js](.\Lambda\index.js) and node_mlodules.
7. upload the zip to the Lambda funtion that has been created in #4. 
        ![](.\help\LambdaZip.png)
8. Save the Lambda function. 
9. switch to [AWS API Gateway](https://aws.amazon.com/api-gateway/). Select the two methods gets3uploadurl getforgetransstatus, in [Integration Request], link the method with the Lambda function and the Lambda region.
      ![](.\help\bindLambda.png)

## Test in AWS UI
1. Test Lambda function
    * in the function, click [Actions]-->[Configure Test Events]. Select [Hello World]. replace with [Lambda_GetS3SignedURL](.\Test Scripts\Lambda_GetS3SignedURL.json). Click [Test] to check if the log tells the a valid signed URL string.
    * in the function, click [Actions]-->[Configure Test Events]. Select [Hello World]. replace with [Lambda_GetForgeTransStatus.json](.\Test Scripts\Lambda_GetForgeTransStatus.json). Input a valid URN (Created by other samples of Forge). Click [Test] to check if the log tells a valid response of [getting manifest of Model Deravitive API](https://developer.autodesk.com/en/docs/model-derivative/v2/reference/http/urn-manifest-GET/). 
    * in the linked S3 bucket, upload a model file in advance. e.g. in this demo, the file is RevitNative.rvt.  In the Lambda function, click [Actions]-->[Configure Test Events]. Select [S3 Put]. Replace with your S3 bucket name and file name:
     ![](.\help\S3Put.png)
   Click [Test] to check if the log tells the workflow of uploading to Forge and requesting translating succeeded. 
     
## Test in Postman
1. Deploy API Gateway for test in production. Export to Postman script. Import the collection to Postman.
2. If IAM is set, you will need to input the parameters of AWS Signature. In my current test, I skipped IAM, just for a simple demo.
    ![](.\help\exportPostman.png)
3. get S3 signed URL. 
   ![](.\help\S3URL.png)
4.  click the URL, select 'PUT' method, input the objectKey (the file name), select the local file, and Send. verify if the file has been uploaded to S3 bucket.
  ![](.\help\uploadS3.png)
5. call the endpoint of checking translating status, input the based 64 encoded URN:
   ![](.\help\checkStatus.png)


## License

[MIT License](http://opensource.org/licenses/MIT)

## Written by

Written by [Xiaodong Liang](http://twitter.com/coldwood)

Forge Partner Development - [http://forge.autodesk.com](http://forge.autodesk.com)

