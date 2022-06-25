const { DynamoDBClient, PutItemCommand  } = require('@aws-sdk/client-dynamodb');

const config = {
  region: 'ap-northeast-1',
};

exports.dynamodb = new DynamoDBClient({ region: config.region });

exports.putitem = async function(item) {
  try {
    const data = await exports.dynamodb.send(new PutItemCommand(item));
    return data;
  } catch(err) {
    throw err;
  }
};

exports.saveSP = function(event, context) {
  if(context.identity == null) {
    context.fail('identity is null');
    return;
  }
  if(context.identity.cognitoIdentityId == null) {
    context.fail('cognitoIdentityId is null');
    return;
  }
  const item = {
    TableName: 'gambleDonSP',
    Item: {
      userId: {S: context.identity.cognitoIdentityId},
      datetime: {S: event.datetime},
      bet: {N: String(event.bet)},
      refund: {N: String(event.refund)}
    }
  };
  exports.putitem(item)
    .then((data) => {
      context.succeed(data);
    })
    .catch((err) => {
      context.fail(err);
    });
};
