var AWS = require('aws-sdk');

var config = {
  region: 'ap-northeast-1',
  dynamoTableName: 'gambleDon',
};

AWS.config.region = config.region;

exports.dynamodb = new AWS.DynamoDB.DocumentClient();

exports.saveSP = function(event, context) {
  if(context.identity == null) {
    context.fail('identity is null');
    return;
  }
  if(context.identity.cognitoIdentityId == undefined) {
    context.fail('cognitoIdentityId is undefined');
    return;
  }
  if(context.identity.cognitoIdentityId == null) {
    context.fail('cognitoIdentityId is null');
    return;
  }
  var item = {
    TableName: 'gambleDonSP',
    Item: {
      userId: context.identity.cognitoIdentityId,
      datetime: event.datetime,
      bet: event.bet,
      refund: event.refund
    }
  };
  exports.dynamodb.put(item, function(err, data) {
    if(err) {
      context.fail(err);
    } else {
      context.succeed(data);
    }
  });
};
