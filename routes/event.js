
/*
 * GET event page.
 */

function eventinfo(event_id){this.id = event_id;this.playerIds = [];}
var events = [];   // all events in server

// Find event by ID
function eventById(id) {
	var i;
	for (i = 0; i < events.length; i++) {
		if (events[i].id == id)
			return events[i];
	};
	
	return false;
};

//create event
function createEvent(id){
    var event = new eventinfo(id);
    events.push(event);
    return event;
}

// Find event by playerid
function eventByPlayerId(id) {
	var i;
	for (i = 0; i < events.length; i++) {
		var j;
		for(j =0; j < events[i].playerIds.length;j++){
		if (events[i].playerIds[j] == id)
			return events[i];
		}
	};
	
	return false;
};

//player join 
function join( eventId, playerId)
{
  var event = eventById(eventId);
  if(event==false) event = createEvent(eventId);
  
  event.playerIds.push(playerId);
  
  return event;

}

//player leave
function leave(playerId)
{
  var event = eventByPlayerId(playerId);
  if(event)
  {
    event.playerIds.splice(event.playerIds.indexOf(playerId), 1);
    return event;
  }
  else
  return false;
}


///////exports
exports.eventlist = events;
exports.eventById = eventById;
exports.join = join;
exports.leave = leave;

exports.event = function(req, res){
  //event id‚ðŽæ“¾
  var str = req.url;
  var strArry = str.split("/");
  var event_id = strArry[strArry.length-1];
  
  //event‚ðŽæ“¾,‘¶Ý‚µ‚È‚¢ê‡Create
  var event = eventById(event_id);
  if(event==false) event = createEvent(event_id);
  
  res.render('event', { event_id: event_id });
};