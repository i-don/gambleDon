'use strict';
var gambleDon = {
  region: 'ap-northeast-1',
  IdentityPoolId: 'ap-northeast-1:832c49ef-f09c-4385-bcf1-e4aa72aeec3d',
  UserPoolId: 'ap-northeast-1_9P7D4UaFm',
  ClientId: '3vhqikvlcs8p17qaoeriiq9luc',
  LoginsKey: 'cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_9P7D4UaFm',
};

gambleDon.UserPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool({
  UserPoolId: gambleDon.UserPoolId,
  ClientId: gambleDon.ClientId
});

/*****************************************************************************
 VIEW
******************************************************************************/
gambleDon.landingView = function() {
  var view=gambleDon.template('landing-view');
  view.find('.anonymous').css('display','none');
  view.find('.signed').css('display','none');
  gambleDon.identity.progress(function(identity) {
    if(identity){
      view.find('.signed').css('display','');
      let d = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2);	// from two days ago
      gambleDon.fetchRecentSP(gambleDon.localDateFmt(d)).then(function(data) {
        if(data.Items) {
          let dataItemTemplate = $('.templates .recentDataItemTemplate').clone();
          $('.recent').empty();
          data.Items.forEach(function(row) {
            let dataItem = dataItemTemplate.clone();
            dataItem.removeClass('recentDataItemTemplate').addClass(row.datetime);  
            dataItem.find('.datetime').text(gambleDon.myDateFmt(row.datetime));
            dataItem.find('.bet').text(row.bet);
            dataItem.find('.refund').text(row.refund);
            if(row.refund > row.bet) {
              dataItem.find('.emoticon').text('\u{1F604}');	// SMILING FACE WITH OPEN MOUTH AND SMILING EYES
            } else if(row.bet > row.refund) {
              dataItem.find('.emoticon').text('\u{1F62D}'); // LOUDLY CRYING FACE
            }
            $('.recent').prepend(dataItem);
          })
        }
      });
    } else {
      view.find('.anonymous').css('display','');
    }
  });
  return view;
}

gambleDon.signinView = function() {
  var cognitoAuthConfig = null;
  var cognitoUser = null;

  function cognitoSignin() {
    var username = $('.username').val();
    var password = $('.password').val();
    if (!username || !password) { return false; }

    gambleDon.Signout().then(
      function() {
        view.find('.message').text('Failed to sign out.');
      },
      function () {
        cognitoAuthConfig = {
          onSuccess: function(result) {
            view.find('.message').text('SignIn Success.');
            gambleDon.refresh().then(function(credentials) {
              $(location).attr('href', '#');
            });
          },
          onFailure: function(err) {
            view.find('.message').text(err.message);
          },
          newPasswordRequired(userAttributes, requiredAttributes) {
            switchElement('.enter-new-cognito-password');
            view.find('.message').text('New Password Required');
          },
        };
        var authenticationData = {
          Username: username,
          Password: password
        };
        var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);
        var userData = {
          Username: username,
          Pool: gambleDon.UserPool
        };
        cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
        cognitoUser.authenticateUser(authenticationDetails, cognitoAuthConfig);
      }
    );
    return false;
  }

  function setCognitoPassword() {
    var newPassword = $('.new-password').val();
    if(!newPassword) { return false; }
    if(cognitoUser && cognitoAuthConfig){
      cognitoUser.completeNewPasswordChallenge(newPassword, {}, cognitoAuthConfig);
    }
    return false;
  }

  function switchElement(elem) {
    var elements = [
       '.enter-cognito-signin',
       '.enter-new-cognito-password'
    ];
    for(var e of elements) {
      if(e==elem) {
        view.find(e).css('display','');
      } else {
        view.find(e).css('display','none');
      }
    }
  }

  var view=gambleDon.template('signin-view');
  switchElement('.enter-cognito-signin');
  view.find('.cognito-signin-btn').click(cognitoSignin);
  view.find('.set-cognito-password-btn').click(setCognitoPassword);
  return view;
}

gambleDon.profileView = function() {
  var view=gambleDon.template('profile-view');

  function dispNoSignIn() {
    view.find('.message').text('No SignIn');
    view.find('.profile-detail').css('display','none');
  }

  function signout() {
    gambleDon.Signout().then(
      function() {
        view.find('.message').text('Failed to sign out.');
      }, 
      dispNoSignIn
    );
    return false;
  }

  view.find('.signout-btn').click(signout);
  gambleDon.refresh().then(
    function(identity) {
      view.find('.message').text('');
      view.find('.profile-detail').css('display','');
      view.find('.username').text(identity.params.UserName);
      view.find('.id').text(identity.identityId);
    },
    dispNoSignIn
  );
  return view;
}

gambleDon.entrySP = function() {

  function setElement(ele, val) {
    let option = $('<option>')
      .val(val)
      .text(('000' + val).slice( -3 ))
    ele.append(option);
  }

  function entry() {
    let datetime = view.find('.datetime').val();
    let bet = parseInt(view.find('.betK').val()) * 1000 + parseInt(view.find('.bet').val());
    let refund = parseInt(view.find('.refundK').val()) * 1000 + parseInt(view.find('.refund').val());
    gambleDon.saveSP(datetime, bet, refund).then(function(){
      $(location).attr('href', '#');
    });
    return false;
  }

  let view=gambleDon.template('entrySP-view');
  view.find('.entry-btn').click(entry);
  let e = view.find('.bet');
  setElement(e,0);
  setElement(e,500);
  for(let i=100;i<1000;i+=100){
    setElement(e,i);
  }
  e = view.find('.betK');
  for(let i=0;i<1000;i++){
    setElement(e,i);
  }
  e = view.find('.refund');
  setElement(e,0);
  setElement(e,500);
  e = view.find('.refundK');
  for(let i=0;i<1000;i++){
    setElement(e,i);
  }

  view.find('.datetime').val(gambleDon.localDateFmt(new Date()));

  return view;
}

/*****************************************************************************
 UTIL
******************************************************************************/
gambleDon.localDateFmt = function(d) {
  return d.getFullYear()
    + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getDate()).slice(-2)
    + 'T' + ('0' + d.getHours()).slice(-2) 
    + ':' + ('0' + d.getMinutes()).slice(-2);
}

gambleDon.myDateFmt = function(dstr) {
  return    dstr.substr(5,2)
    + '/' + dstr.substr(8,2)
    + ' ' + dstr.substr(11,5);
}

/*****************************************************************************
 AUTHENTICATION
******************************************************************************/
gambleDon.Signout = function() {
  if(gambleDon.UserPool.getCurrentUser()) {
    gambleDon.UserPool.getCurrentUser().signOut();
  }
  AWS.config.credentials = null;
  return gambleDon.refresh();
}

gambleDon.identity = new $.Deferred();

gambleDon.refresh = function(forced) {
  var deferred = new $.Deferred();

  function AwsRefresh() {
    AWS.config.region = gambleDon.region;
    if(AWS.config.credentials){
      AWS.config.credentials.clearCachedId();
      AWS.config.credentials.refresh(function(err) {
        if (err) {
          console.log(err);
          gambleDon.identity.notify();
          deferred.reject(err);
        } else {
          gambleDon.identity.notify(AWS.config.credentials);
          deferred.resolve(AWS.config.credentials);
        }
      });
    } else {
      gambleDon.identity.notify();
      deferred.reject();
    }
  }

  var cognitoUser = gambleDon.UserPool.getCurrentUser();
  if(cognitoUser) {
    cognitoUser.getSession(function(errGS, currSession) {
      if(currSession) {
        if(AWS.config.credentials) {
          var doRefresh = false;
          if(forced) {
            doRefresh = true;
          } else if(!AWS.config.credentials.expireTime) {
            doRefresh = true;
          } else {
            var remainingTime = (AWS.config.credentials.expireTime.getTime() - Date.now()) / 1000;
            if(remainingTime < 300) {
              doRefresh = true;
            }
          }
          if(doRefresh) {
            var refresh_token = currSession.getRefreshToken();
            if(refresh_token) {
              cognitoUser.refreshSession(refresh_token, function(errRS, newSession) {
                if(newSession) {
                  AWS.config.credentials.params.Logins[gambleDon.LoginsKey] = newSession.getIdToken().getJwtToken();
                }
                AwsRefresh();
              });
            } else {
              AwsRefresh();
            }
          } else {
            deferred.resolve(AWS.config.credentials);
          }
        } else {
          var logins = {};
          logins[gambleDon.LoginsKey] = currSession.getIdToken().getJwtToken();
          AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: gambleDon.IdentityPoolId,
            Logins: logins,
            UserName: cognitoUser.username
          });
          AwsRefresh();
        }
      } else {
        AwsRefresh();
      }
    });
  } else {
    AwsRefresh();
  }

  return deferred.promise();
}

/*****************************************************************************
 CONTROL
******************************************************************************/
gambleDon.showView = function(hash) {
  var routes = {
    '#signin':gambleDon.signinView,
    '#profile':gambleDon.profileView,
    '#entrySP':gambleDon.entrySP,
    '#':gambleDon.landingView,
    '':gambleDon.landingView
  };
  var hashParts = hash.split('-');
  var viewFn = routes[hashParts[0]];
  if (viewFn) {
    gambleDon.triggerEvent('removingView', [])
    $('.view-container').empty().append(viewFn(hashParts[1]));
  }
}

gambleDon.appOnReady = function(hash) {
  gambleDon.identity.progress(function(identity) {
    if(identity){
      $('.nav-list').find('.signin-link-li').css('display','none');
      $('.nav-list').find('.profile-link-li').css('display','');
      $('.nav-list').find('.profile-link').text(identity.params.UserName);
    } else {
      $('.nav-list').find('.signin-link-li').css('display','');
      $('.nav-list').find('.profile-link-li').css('display','none');
    }
  });

  window.onhashchange = function() {
    gambleDon.showView(window.location.hash);
  }

  gambleDon.refresh();
  gambleDon.showView(window.location.hash);
}

gambleDon.triggerEvent = function(name, args) {
  $('.view-container>*').trigger(name, args);
}

gambleDon.template = function(name) {
  return $('.templates .' + name).clone();
}

/*****************************************************************************
 SERVICE ACCESS
******************************************************************************/
gambleDon.saveSP = function(datetime, bet, refund) {
  return gambleDon.refresh().then(function() {
    var lambda = new AWS.Lambda();
    var params = {
      FunctionName: 'saveSP',
      Payload: JSON.stringify({
        datetime: datetime,
        bet: bet,
        refund: refund
      })
    };
    return gambleDon.sendAwsRequest(lambda.invoke(params), function() {
      return gambleDon.saveSP(datetime, bet, refund);
    });
  });
}

gambleDon.sendAwsRequest = function(req, retry) {
  var deferred = new $.Deferred();
  req.on('error', function(error) {
    if(error.code === "CredentialsError") {
      gambleDon.refresh(true).then(
        function(credentials) {
          return retry();
        },
        function(errorRef) {
          console.log(errorRef);
          deferred.reject(errorRef);
        }
      );
    } else {
      console.log(error);
      deferred.reject(error);
    }
  });
  req.on('success', function(resp) {
    deferred.resolve(resp.data);
  });
  req.send();
  return deferred.promise();
}

/*****************************************************************************
 DB ACCESS
******************************************************************************/
gambleDon.fetchRecentSP = function(datetimeFrom) {
  return gambleDon.refresh().then(function(identity) {
    var db = new AWS.DynamoDB.DocumentClient({region: gambleDon.region});
    var item = {
      TableName: 'gambleDonSP',
      KeyConditionExpression: '#u = :userId and #d >= :datetimeFrom',
      ExpressionAttributeNames:{
        '#u': 'userId',
        '#d': 'datetime'
      },
      ExpressionAttributeValues: {
        ':userId': identity.identityId,
        ':datetimeFrom': datetimeFrom
      }
    };
    return gambleDon.sendDbRequest(db.query(item), function() {
      return gambleDon.fetchRecentSP(datetimeFrom);
    });
  });
}

gambleDon.sendDbRequest = function(req, retry) {
  var deferred = new $.Deferred();
  req.on('error', function(error) {
    if(error.code === "CredentialsError") {
      gambleDon.refresh(true).then(
        function(credentials) {
          return retry();
        },
        function(errorRef) {
          console.log(errorRef);
          deferred.reject(errorRef);
        }
      );
    } else {
      console.log(error);
      deferred.reject(error);
    }
  });
  req.on('success', function(resp) {
    deferred.resolve(resp.data);
  });
  req.send();
  return deferred.promise();
}
