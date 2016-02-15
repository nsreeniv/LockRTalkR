var Twit = require('twit');
var Promise = require('bluebird');
var Express = require('express');

var app     = Express();
app.set('port', (process.env.PORT || 5000));

app.get('/', function(request, response) {
    var result = 'App is running'
    response.send(result);
}).listen(app.get('port'), function() {
    console.log('App is running, server is listening on port ', app.get('port'));
});

var T = new Twit({
    consumer_key:         process.env.CONSUMER_KEY,
    consumer_secret:      process.env.CONSUMER_SECRET,
    access_token:         process.env.ACCESS_TOKEN,
    access_token_secret:  process.env.ACCESS_TOKEN_SECRET,
    timeout_ms:           60*1000,  
})

var LIST_SLUG = 'sports-teams';
var OWNER_SCREEN_NAME = 'LockRTalkR';

setInterval( function(){
    
    LockRTalkR();

}, 2 * 60 * 1000);  //Timer set to refresh app every 2 minutes 

function LockRTalkR()
{
    var handleMap = {};

    T.get('lists/members', { slug: LIST_SLUG, 
    	                       owner_screen_name : OWNER_SCREEN_NAME, 
    	                       count : 5000 } )

      .then(function (result) {
          handleMap = buildHandleMap( result.data );
      })
      .then(function () {
          return T.get('lists/statuses', { slug: LIST_SLUG, 
          	                               owner_screen_name: OWNER_SCREEN_NAME, 
          	                               count: 1000,
                                           include_rts: false } )
      })
      .then(function (tweetData) {

          var tweets = tweetData.data;
          var promises = [];
          console.log('Fetched ', tweets.length, ' tweets from list: ', LIST_SLUG )

          for( var i = 0; i < tweets.length ; i++)
          {
              var currentTweet = tweets[i];
              var screenName = currentTweet.screen_name;
              var tweetId = currentTweet.id_str;
              var tweetText = currentTweet.text;
              var userMentionedHandles = currentTweet.entities.user_mentions;

              if( userMentionedHandles )
              {
                  for( var k = 0; k < userMentionedHandles.length; k++ )
                  {
                      var mentionedHandle = userMentionedHandles[k].screen_name;

                      // Do not retweet if the user mentions themselves
                      if( screenName === mentionedHandle )
                          continue;
                      else if( handleMap[mentionedHandle] )
                      {
                          promises.push(retweet( tweetId, tweetText ));
                          break;
                      }
                  }
              }
          }

          return Promise.all(promises);
      })
      .catch(function (err) {
          console.log('caught error', err.stack)
      })
}

// -----------------------------------------------------
// -----------------------------------------------------

function buildHandleMap( allTeamData )
{
    var handleMap = {};

    for( var i = 0; i < allTeamData.users.length; i++ )
    {
        var team = allTeamData.users[i];
        var teamHandle = team.screen_name;
        var teamName = team.name;

        handleMap[teamHandle] = teamName;
    }

    return handleMap;
}

function retweet( tweetId, tweetText )
{
    console.log('Retweeting [', tweetId, ']: ', tweetText );
    
    return T.post('statuses/retweet/:id', { id: tweetId }) 
      .then( function (result) {
          console.log('Successfully retweeted.');
      })
      .catch(function (err) {
          console.log('Could not retweet - error: ', err.stack)
      })
}


