const AWS = require('aws-sdk');
var rdsdataservice = new AWS.RDSDataService();

exports.handler = async function(event: any, context: any) {
  const method = event.httpMethod;
  const recordName = event.path.startsWith('/') ? event.path.substring(1) : event.path;

  // Defining parameters for rdsdataservice
  let params: { [name: string]: string } = {
    resourceArn: process.env.CLUSTER!,
    secretArn: process.env.SECRET!,
    database: process.env.DATABASE!,
  };

  if (method === "GET") {
    if (event.path === "/bus") {
      //Here is where we are defining the SQL query that will be run at the DATA API
      params.sql = 'select * from vehicles where vehicle_type like "bus"';
      const data = await rdsdataservice.executeStatement(params).promise();
      const body = {
        data,
      };
      return {
        statusCode: 200,
        headers: {},
        body: JSON.stringify(body)
      };
    }
  }
  else {
    return {
      statusCode: 400,
      headers: {},
      body: "We only accept GET not " + method
    };
  } 
}