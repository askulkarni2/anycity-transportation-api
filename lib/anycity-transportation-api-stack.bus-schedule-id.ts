var AWS = require("aws-sdk");
var rdsdataservice = new AWS.RDSDataService();
exports.handler = async function(event, context) {
  const method = event.httpMethod;
  const recordName = event.path.startsWith("/") ? event.path.substring(1) : event.path;
  let params = {
    resourceArn: process.env.CLUSTER,
    secretArn: process.env.SECRET,
    database: process.env.DATABASE,
    includeResultMetadata:true //enable this flag to return column names
  };
  //function to convert verbose response to key-value pairs
   const parseDataServiceResponse = res => {
      let columns = res.columnMetadata.map(c => c.name);
      let data = res.records.map(r => {
          let obj = {};
          r.map((v, i) => {
              obj[columns[i]] = Object.values(v)[0]
          });
          return obj
      })
      return data
  }
  
  if (method === "GET") {
    if (event.path.includes("/bus/schedules/")) {
      params.sql = 'select v.*, s.stop_time, s.stop from vehicles v right join schedules s on v.id = s.vehicle_id where v.id ='+event.queryStringParameters.id;
      const response = await rdsdataservice.executeStatement(params).promise();
      
      return {
        statusCode: 200,
        headers: {},
        body: JSON.stringify(parseDataServiceResponse(response)),
        isBase64Encoded:false
      };
    }
  } else {
    return {
      status:"failure",
      statusCode: 400,
      headers: {},
      body: "We only accept GET not " + method
    };
  }
};
