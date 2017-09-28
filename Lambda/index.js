/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Xiaodong Liang, Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////


console.log("Version 0.1.0");

// Load up all dependencies
var AWS = require('aws-sdk');
var async = require('async');
var fs= require('fs');
 
// 
// Create a reference to an S3 client
// in the desired region.
// referred from : 
function createS3(regionName) {
    var config = { apiVersion: '2006-03-01' };
    
    if (regionName != null)
        config.region = regionName;

    var s3 = new AWS.S3(config);
    return s3;
}


//referred to Forge SDK of Node.js
//https://github.com/Autodesk-Forge/forge-api-nodejs-client
var ForgeSDK = require('forge-apis');

// get credencials from Lambda enviornment variables
var CLIENT_ID = process.env.FORGE_CLIENT_ID,
	CLIENT_SECRET = process.env.FORGE_CLIENT_SECRET;
//get bucket key
var BUCKET_KEY = process.env.FORGE_BUCKET_KEY;

//Forge SDK objects
var bucketsApi = new ForgeSDK.BucketsApi(), // Buckets Client
    objectsApi = new ForgeSDK.ObjectsApi(); // Objects Client
	derivativesApi = new ForgeSDK.DerivativesApi(); // Derivative Client


// Initialize the 2-legged oauth2 client
var oAuth2TwoLegged = new ForgeSDK.AuthClientTwoLegged(CLIENT_ID, CLIENT_SECRET,
	['data:write', 'data:read', 'bucket:read','bucket:update','bucket:create'], true);


 //General error handling method
function defaultHandleError(err) {
    console.error('\x1b[31m Error:', err, '\x1b[0m' ) ;
    //callback('\x1b[31m Error:', err, '\x1b[0m');
}

/**
 * Gets the details of a bucket specified by a bucketKey.
 * Uses the oAuth2TwoLegged object that you retrieved previously.
 * @param bucketKey
 */
var getBucketDetails = function (bucketKey) {
	console.log("**** Getting bucket details : " + bucketKey);
	return bucketsApi.getBucketDetails(bucketKey, oAuth2TwoLegged, oAuth2TwoLegged.getCredentials());
};

/**
 * Create a new bucket.
 * Uses the oAuth2TwoLegged object that you retrieved previously.
 * @param bucketKey
 */
var createBucket = function (bucketKey) {
	console.log("**** Creating Bucket : " + bucketKey);
	var createBucketJson = {'bucketKey': bucketKey, 'policyKey': 'temporary'};
	return bucketsApi.createBucket(createBucketJson, {}, oAuth2TwoLegged, oAuth2TwoLegged.getCredentials());
};

/**
 * This function first makes an API call to getBucketDetails endpoint with the provided bucketKey.
 * If the bucket doesn't exist - it makes another call to createBucket endpoint.
 * @param bucketKey
 * @returns {Promise - details of the bucket in Forge}
 */
var createBucketIfNotExist = function (bucketKey) {
	console.log("**** Creating bucket if not exist :", bucketKey);

	return new Promise(function(resolve, reject) {
		getBucketDetails(bucketKey).then(function (resp) {
            console.log("**** getBucketDetails done:", resp);
            
				resolve(resp);
			},
			function (err) {
				if (err.statusCode === 404) {
					createBucket(bucketKey).then(function(res){
							resolve(res);
						},
						function(err){
							reject(err);
						})
				}
				else{
					reject(err);
				}
			});
	});
};

/**
 * Upload a File to previously created bucket.
 * Uses the oAuth2TwoLegged object that you retrieved previously.
 * @param bucketKey
 * @param filePath
 * @param fileName
 * @returns {Promise}
 */
var uploadFile = function(bucketKey, filePath, fileName){
	console.log("**** Uploading file. bucket:"+ bucketKey + " filePath:"+filePath);
	return new Promise(function(resolve, reject) {
		fs.readFile(filePath, function (err, data) {
			if (err){
				console.log('Uploading file to Forge>>fs.readFile error: ' + err);
                
				reject(err);
			}
			else{
				objectsApi.uploadObject(bucketKey, fileName, data.length, data, {}, 
							oAuth2TwoLegged, oAuth2TwoLegged.getCredentials()).then(
					function(res){
						console.log('Uploading file to Forge>>objectsApi.uploadObject done');
                        
						resolve(res);
					},function(err){
                        console.log('Uploading file to Forge>>objectsApi.uploadObject error:' + err );
                        
						reject(err);
					}
				)
			}
		});
	});
}; 
 

/**
 * Translate the file uploaded by the application.
 * Uses the oAuth2TwoLegged object that you retrieved previously.
 * @param objectId
 */
var translateFile = function(objectId) {
    console.log("**** requesting translating file :" + objectId);

	//configure request job
    var job = {
        input: {
            // urn of zip file
            "urn": new Buffer (objectId).toString ('base64')
        },
        output: {
            "formats": [
                {
                    "type": "svf",
                    "views": [
                        "3d"
                    ]
                }
            ]
        }
    };

	//override the last derivative
    var ops = {
        xAdsForce:true
    };
    
	return derivativesApi.translate(job,ops,oAuth2TwoLegged, oAuth2TwoLegged.getCredentials());
};

/**
 * Get the buckets owned by an application.
 * Uses the oAuth2TwoLegged object that you retrieved previously.
 */
var getBuckets = function(){
	console.log("**** Getting all buckets");
	return bucketsApi.getBuckets({},oAuth2TwoLegged, oAuth2TwoLegged.getCredentials());
};


//send file to Forge and request to translate
function callForgeProcess(s3FilePath,s3FileName,callback)
{
	/**
	 * Create an access token and run the API calls.
	 */
	oAuth2TwoLegged.authenticate().then(function(credentials){
		
			console.log("**** Got Credentials",credentials);
		
			createBucketIfNotExist(BUCKET_KEY).then(
		
				function(createBucketRes){ 
		
					uploadFile(BUCKET_KEY, s3FilePath, s3FileName).then(function(uploadRes){
 						
						console.log("**** Upload file response:", uploadRes.body); 
						//delete the local file in Lambda space
                        			fs.unlink(s3FilePath); 
                         
						var objectId = uploadRes.body.objectId;  
						
						translateFile(objectId).then(function(transRes){
                            				console.log("**** Translate file response:", transRes.body);
                            				callback(null,transRes.body) ; 
							
						}, defaultHandleError);
		
					}, defaultHandleError);
		
				}, defaultHandleError);
		
		}, defaultHandleError);
  }


function checkForgeTransStatus(urn,callback)
{
	  //get token
	  oAuth2TwoLegged.authenticate().then(function(credentials){
		  //get translating status of Forge
		 derivativesApi.getManifest(urn,{},
		      oAuth2TwoLegged, oAuth2TwoLegged.getCredentials())
			   .then(function(transStRes){
			//callback for Lambda 
			callback(null, transStRes);
		});
		
	  }, defaultHandleError); 

}
  


// processRecord
//
// Iterator function for async.each (called by the handler above).
//
// 1. Get the target bucket from the source bucket's tags
// 2. save the file stream to Lambda space.
// 3. trigger the workflow of uploading file to Forge and requesting translating.
function processRecord(record, callback) { 
	 console.log('yyy'+process.env.FORGE_CLIENT_SECRET);
	
    // The source bucket and source key are part of the event data
	console.log(record);

	//get bucket name
	var srcBucket = record.s3.bucket.name;
	//get object name
    var srcKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
        
    var s3 = createS3();
    var getParams = {Bucket: srcBucket, Key: srcKey}; 
	
	//writing the S3 object to Lambda local space
    var wstream = require('fs').createWriteStream('/tmp/'+srcKey);
    
    s3.getObject(getParams)
    .on('error', function (err) {
        console.log('s3.getObject error:' + err);
        callback(null,'s3.getObject error:' + err);
    })
    .on('httpData', function (chunk) {
        //console.log('s3.getObject httpData'); 
        wstream.write(chunk);
    })
    .on('httpDone', function () {
        console.log('s3.getObject httpDone:'); 
        console.log('sending to Forge translation'); 
         
		wstream.end(); 
		callForgeProcess('/tmp/'+srcKey,srcKey,callback);  
    })
    .send();  
}; 

// This is the entry-point to the Lambda function.
exports.handler = function (event, context,callback) {
	
   console.log('event:' + JSON.stringify(event));
   if (event.Records == null) { 
	   if(event.query.uploadS3){
		   //if this is from trigger of API GateWay
		   //return the S3 signed url for uploading file

		   var s3Bucket = process.env.S3Bucket;
		   //the file name of this upload
		   var objectKey = event.query.objectKey;

		   var s3 = new AWS.S3({
			   signatureVersion: 'v4',
		   });

		   //get upload url.
		   var url = s3.getSignedUrl('putObject', {
			   Bucket: s3Bucket,
			   Key: objectKey,
			   //set the expire time of signed URL per your requirement
			   Expires: 60*10, // increase the valid time if it is a large file
			 });
	   
		   callback(null, url); 

	   }
	   else if(event.query.checkForgeStatus){

		   //when checking the status of translating 

		   var urn = event.query.urn; 
		   
		   checkForgeTransStatus(urn,callback);
 
	   }
	   else{
		   context.fail('Error', "unknown events!" + JSON.stringify(event));
		   return;
	   }
   }
   else{
	   //this should be the trigger from S3 events

	   // Process all records in the event asynchronously.
	   async.each(event.Records, processRecord, function (err) {
		   if (err) {
			   context.fail('Error',err); 
		   } else {
			   context.succeed();
		   }
	   });
   } 
   
};
