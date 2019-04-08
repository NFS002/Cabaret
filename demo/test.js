const utils = require( "../lib/utils" );

let location = utils.generateRandomLocation({
    shouldUpdate: true
});

console.log( location );
location_json = location.toJSON();
console.log( location_json );


location = new utils.Location(location.lat, location.long, location.opts, location.state);

setTimeout( () => {
    console.log(location);
}, 1000)
setTimeout( () => {
    console.log(location);
}, 2000)