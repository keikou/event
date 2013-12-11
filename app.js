


var express = require('express')
  , routes = require('./routes/event')
  , http = require('http')
  , path = require('path');

var app = express();

/////all environments
app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.methodOverride());
  app.use(app.router);
  
  app.use(express.static(path.join(__dirname, 'public')));
});


app.get('/events/:event_id', routes.event);


//Create HTTP Server
var server = http.createServer(app).listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});



///////////////////////////////////////////////////////////////////////////////////////////////
//                                      Web Socket
///////////////////////////////////////////////////////////////////////////////////////////////
var socketio = require('socket.io').listen(server);

/////////////////////////////////////////////////////////////////////////////////////
function playerinfo(id,name){ this.id=id; this.name=name;this.status="notready"; }

var players = [];  // all players connected with server
var gPlayerNum=0;//increase the user num(temp)

//register player
function register(id,name){   
  if(id==name){
    players.push(new playerinfo(id,"ゲスト_"+gPlayerNum++));
  }
  else
  {
    gPlayerNum++;
    players.push(new playerinfo(id,name));
  }
}

// Find player by ID
function playerById(id) {
	var i;
	for (i = 0; i < players.length; i++) {
		if (players[i].id == id)
			return players[i];
	};
	
	return false;
};

//Get Event Players
function playersInEvent(event_id)
{
  var playerslist = [];
  var event = routes.eventById(event_id);
  
  var i;
  for (i = 0; i < event.playerIds.length; i++) {
  	playerslist.push( playerById(event.playerIds[i]) );
  }
  
  return playerslist;
  
}


// Socket client Disconnect Handler
function onClientDisconnect() {
	var removePlayer = playerById(this.player_id);

	// Player not found
	if (!removePlayer) {
		//util.log("Player not found: "+this.player_id);
		return;
	};
    
    // Remove player from players array
	players.splice(players.indexOf(removePlayer), 1);
    
    //leave the event
    var event = routes.leave(removePlayer.id);
    if(event) this.leave( this.player_id );
	else
		return;
	
	// Broadcast removed player to connected socket clients
	this.broadcast.to(event.id).emit('push', {from:"server" , to:"othersInEvent" , msg:removePlayer.name +" が退出しました！"});
	this.broadcast.to(event.id).emit('playerout', removePlayer);


};
////////////////////////////////////////////////////////////////////////////////////////




// Socket client connection 
socketio.of('/mobbing').on('connection', function(client) {

  
  /////Handlerの設定
  
  //Join
  client.on('join', function(param) { // クライアントから joinを受信した時
    
    var player_id = param.player_id;
    if(!player_id) player_id = client.id;
    
    //player 登録
    if(param.username) register(player_id, param.username);
    else register(player_id, player_id);
    
    //event へjoin
    var event = routes.join( param.event_id , player_id );
    client.join( event.id );
    client.event_id = event.id; //save event id to socket;
    client.player_id = player_id;//save player id to socket;
    
    //Event内、他のPlayerへ参加したことを通知
    client.broadcast.to(event.id).emit('push', {from:"server" , to:"othersInEvent" , msg:playerById(player_id).name +" が参加しました！"} );
    client.broadcast.to(event.id).emit('playerin', playerById(player_id));
  
    //Event内、すべてのPlayerの情報を取得し、自分に振り分けられたidを取得
    client.emit('playersupdate', playersInEvent(event.id) );
    client.emit('currentplayer',  playerById(player_id));
    
  });


  //Disconnected
  client.on("disconnect", onClientDisconnect); // クライアントDisconnect時

  //Send 
  client.on('send', function(param) { // クライアントから send を受信した時
    client.emit('push', {from:client.player_id , to:client.player_id , msg:param.message}); // クライアントに push を送信
    if(client.event_id)
    {
      client.broadcast.to(client.event_id).emit('push', {from:client.player_id, to:"othersInEvent", msg: playerById(client.player_id).name +" : "+param.message}); // 他クライアントにも push イベントを送信
    }
    else///lobbyにいる、Eventへ未参加
    {
      client.broadcast.emit('push', {from:client.player_id, to:"othersInEvent", msg: playerById(client.player_id).name +" : "+param.message}); // 他クライアントにも push イベントを送信
    }
  });
  
  //status
  client.on('status', function(param) {
    //change status
    playerById(client.player_id).status = param.message;
    
    //broadcast to others in the Event
  	if(client.event_id)
    {
      client.broadcast.to(client.event_id).emit('status', {from:client.player_id, to:"othersInEvent", msg: param.message}); // 他クライアントにも push イベントを送信
    }
  });
  



});



