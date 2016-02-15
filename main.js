var Twit = require('twit');
var Promise = require('bluebird');

var T = new Twit({
    consumer_key:         '',
    consumer_secret:      '',
    access_token:         '',
    access_token_secret:  '',
    timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
})

var LIST_SLUG = 'sports-teams';
var OWNER_SCREEN_NAME = 'LockRTalkR';

setInterval( function(){
    
    LockRTalkR();

}, 5 * 1000);  //Timer set to refresh app every 30 seconds 

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
          //console.log('tweetData =', (tweetData));
          var tweets = tweetData.data;
          var promises = [];
          console.log('Fetched ', tweets.length, ' tweets from list: ', LIST_SLUG )

          for( var i = 0; i < tweets.length ; i++)
          {
              var currentTweet = tweets[i];
              var tweetId = currentTweet.id_str;
              var tweetText = currentTweet.text;
              var userMentionedHandles = currentTweet.entities.user_mentions;

              if( userMentionedHandles )
              {
                  for( var k = 0; k < userMentionedHandles.length; k++ )
                  {
                      var mentionedHandle = userMentionedHandles[k].screen_name;

                      if( handleMap[mentionedHandle] )
                      {
                          promises.push(retweet( tweetId, tweetText ));
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


