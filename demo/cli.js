/* External dependencies */
const _ = require("underscore");
const minimist = require("minimist");
const ip = require("ip");
const readline = require("readline");

/* Local dependencies */
const { version } = require("../package.json");
const { Bucket } = require("../lib/bucket.js");
const { isAddress, isPort, isRange, isId, injectLocationUpdates,
        generateRandomLocation, generateRandomLocations, 
        isInterval } = require( "../lib/utils.js" )

/* Parse command line arguments, 
* removing the first two since they will always be 
* '<interpreter> <script>' */
const argv = minimist(process.argv.slice(2));

/* Compact arguments, removing redundant white space */
argv._ = _.compact(argv._);


/**
 * Function: printUsage
 * Prints instructions on running the program.
 */
function printUsage() {
  const arg0 = "chord";
  const spacer = " ".repeat(arg0.length);
  console.log(`Usage: ${arg0} [--version] [--range <range>] [--help] [-p <port>]`);
  console.log(`       ${spacer} [-r <replicas>] [--join <address>] [--update <interval>]\n`);
}

/**
 * Function: printHelp
 * Prints available commands in the 
 * programs cli interface.
 */
function printHelp() {
  console.log("Commands:");
  console.log(" join <address>                 Add this peer to a network.");
  console.log(" get <key>                      Read a value from network.");
  console.log(
    " set <key> [value]              Create/update a key in the network."
  );
  console.log(
    " del <key>                      Delete a key and value from the network."
  );
  console.log(" ping <address>                 Ping a remote peer.");
  console.log(" range <driver_id>              Set a random location for the given driver_id.");
  console.log(" range <driver_id>:<driver_id>  Set a random location for the given range of driver_ids.");
  console.log(
    " state [address] [-f]           Print peer information and optional finger table."
  );
  console.log(" dump [address]                 Print local bucket contents.");
  console.log(" quit                           Leave the network and exit.");
  console.log(" help                           Show this screen.\n");
}


/* Check for invalid program arguments */
if (argv._.length > 0) {
  let argument = argv._[0];
  console.error( `Unrecognised argument: ${argument}` );
}
else if ((_.has(argv, "p") && argv.p !== 0 && !isPort(argv.p)) ) {
  let p = argv.p;
  console.error( `Invalid port number: ${p}` )
}
else if ((_.has(argv, "r") && !_.isNumber(argv.r))) {
  let successor_count = argv.r;
  console.error( `Invalid successor count: ${successor_count}` )
}
else if (_.has(argv, "join") && !isAddress(argv.join)) {
  let host_to_join = argv.join;
  console.error( `Invalid host: ${host_to_join}` )
}
else if (_.has(argv, "range") && !isRange(argv.range) && !isId(argv.range)) {
  let range = argv.range;
  console.error( `Invalid range: ${range}` )
}
else if (_.has(argv, "update") && !_.has(argv, "range")) {
  console.error( `The --update option is only valid with the --range option` )
}
else if (_.has(argv, "update") && !isInterval(argv.update)) {
  console.error( `The update interval must be a valid time in milliseconds` )
}

/* If --version or --help is given
* as a program argument, print
* to console and exit. */

else if (argv.version) {
  console.log(version);
} 

else if (argv.help) {
  printUsage();
  printHelp();
}

/* Start the program */
else {
  (async () => {

    const rl = readline.createInterface(process.stdin, process.stdout);

    const bucket = new Bucket({
      nSuccessors: argv.r
    });

    let host, key, value;

    /* The bucket emits events when a new 
    * predecessor or successor is recognised.
    * Here, we handle these events, i.e by printing
    * to console */
    bucket.on("predecessor::up", up => {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      console.log( `Event: predecessor::up ${up}` );
      rl.prompt(true);
    });

    bucket.on("predecessor::down", down => {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      console.log( `Event: predecessor::down ${down}` );
      rl.prompt(true);
    });

    bucket.on("successor::up", up => {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      console.log( `Event: successor::up ${up}` );
      rl.prompt(true);
    });

    bucket.on("successor::down", down => {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      console.log( `Event: successor::down ${down}` );
      rl.prompt(true);
    });


    /* Start the gRPC server. If this fails, the process exits */
    try {
      await bucket.listen(argv.p, ip.address());
      console.log(`${bucket.id.toString("hex")} listening on ${bucket.address}` );
    } 
    catch (e) {
      console.error( `ERR: Unable to start server: ${e.message ? e.message : "Unknown"}` );
      process.exit(1);
    }

    /* Initial join, if the --join option
     * was given at command line.
     */
    if (_.has(argv, "join" )) {
      try {
        await bucket.join(argv.join);
      }
      catch(e) {
        console.error( `ERR: Unable to join host '${argv.join}': ${e.message ? e.message : "Unknown"}` );
        rl.prompt();
      }
    }

    /* Initial range setting,
     * if the --range option
     * was given at command line.
     * The range option is only valid 
     * if given with a successfull initial 
     * join option, although lowering the maintenance protocol
     * interval would allow them to be specified seperately.
     */

    if (_.has(argv, "range")) {

      if ( bucket.predecessor ) {

        const locations = generateRandomLocations( argv.range );

        try {
          
          locations.forEach( async location => {
            key = location.id.toString();
            value = Buffer.from( JSON.stringify( location.location) );
            await bucket.set( key, value );
          });
          
          console.log( `Successfully set locations for range: ${argv.range}` )

          if (_.has( argv, "update" )) {

            setInterval( () => {
              injectLocationUpdates( argv.range, rl );
            }, argv.update );

            console.log( `Scheduled ${argv.update}ms location updates for range: ${argv.range}` );

          }
        }
        catch(e) {
          console.error( `Unable to set locations from '${key}': ${e.message ? e.message : "Unknown"}` )
        }

      }
      else {

        console.error( 
          'Unable to set initial location range. \
          This may be due to attempting to set the --range option \
          at the command line without the ---join option, or if the \
          initial join failed. \
          You may either specify it now from the interface instead,\
          or restart the program with the correct argumets. \
          Lowering the maintenance protocol interval may also prevent  \
          this error from occuring in the future.'
        .replace( /  +/g, ' ' ));
      }
    }

    rl.prompt();

    /* Exit the process when the interface closes */
    rl.on("close", () => {
      process.exit(0);
    });

    /* Handle the empty line */
    rl.on("line", line => {
      if (!line) {
        rl.prompt();
        return;
      }

      const [command, ...commandArgs] = line.trim().split(" ");
      const parsedCommandArgs = minimist(commandArgs);
      parsedCommandArgs._ = _.compact(parsedCommandArgs._);

      switch (command) {
        case "ping":
          host = parsedCommandArgs._[0];

          if (!isAddress(host)) {
            printHelp();
            rl.prompt();
            break;
          }

          (async () => {
            try {
              const t = await bucket.ping(host);
              console.log(`<Ping ${host}> ${(t[1] / 1e6).toPrecision(3)} ms`);
            }
            catch (e) {
              console.error(e);
            }

            finally {
              rl.prompt();
            }
          })();
          break;

        case "join":
          host = parsedCommandArgs._[0];

          if (!isAddress(host)) {
            printHelp();
            rl.prompt();
            break;
          }

          (async () => {
            try {
              await bucket.join(host);
            } catch (e) {
              console.error(e);
            } finally {
              rl.prompt();
            }
          })();
          break;

        case "get":
          key = parsedCommandArgs._[0];

          if ( !_.isString( key ) && !isId( key ) ) {
            console.error( `Invalid key: ${key}. Argument must a valid driver_id or a string. Type help for a list of available commands`)
            rl.prompt();
            break;
          }

          (async () => {
            try {
              value = await bucket.get( key.toString() );
              console.log( `<Entry ${key}> ${value.toString("utf8")}` );
            } catch (__) {
              console.error( `<Entry ${key}> undefined` );
            } finally {
              rl.prompt();
            }
          })();
          break;

        case "set":

          if (parsedCommandArgs._.length != 2 || Object.keys( parsedCommandArgs ).length > 2 ) {
            console.error( `Invalid arguments. Type 'help' for a list of available commands.` )
          }

          else {

            key = parsedCommandArgs._[0].toString();
            value = Buffer.from(parsedCommandArgs._.slice(1).join(" "));

            (async () => {
                try {
                  await bucket.set(key, value);
                } 
                catch (e) {
                  console.error( `Unable to set key '${key}': ${e.message ? e.message : "Unknown"}` );
                } 
                finally {
                  rl.prompt();
                }
            })();
          }
         
          rl.prompt();

        break;
        case "del":
          key = parsedCommandArgs._[0];

          if (!_.isString(key)) {
            printHelp();
            rl.prompt();
            break;
          }

          (async () => {
            try {
              await bucket.del(key);
            } catch (e) {
              console.error(e);
            } finally {
              rl.prompt();
            }
          })();
          break;

        case "state":
          host = parsedCommandArgs._[0];

          /* Print local state */
          if (!isAddress(host)) {
            host = undefined;
          }

          (async () => {
            try {
              const response = await bucket.state(host, parsedCommandArgs.f);
              console.log(
                `<Predecessor> ${
                  response.predecessor ? response.predecessor : ""
                }`
              );
              console.log(`<Self> ${response.address}`);
              response.successor.forEach((successor, i) => {
                console.log(`<Successor ${i}> ${successor}`);
              });
              if (parsedCommandArgs.f) {
                response.finger.forEach((finger, i) => {
                  console.log(`<Finger ${i}> ${finger}`);
                });
              }
            } catch (e) {
              console.error(e);
            } finally {
              rl.prompt();
            }
          })();
          break;

        case "dump":
          host = parsedCommandArgs._[0];

          /* Print local bucket contents */
          if (!isAddress(host)) {
            host = undefined;
          }

          (async () => {
            try {
              const entries = await bucket.dump(host);
              Object.keys(entries).forEach(entryKey => {
                console.log(
                  `<Entry ${entryKey}> ${entries[entryKey].toString("utf8")}`
                );
              });
            } 
            catch (e) {
              console.error(e);
            } 
            finally {
              rl.prompt();
            }
          })();
          break;

        case "range":
          key = parsedCommandArgs._[0];

          if (parsedCommandArgs._.length > 1) {
            let arg = parsedCommandArgs._[1];
            console.error( `Unrecognised arguement: ${arg}` );
          }

          else if (Object.keys( parsedCommandArgs ).length > 1 ) {
            let opt = Object.keys( parsedCommandArgs )[1];
            console.error( `Unrecognised option: ${opt}` );
          }

          else if ( isRange(key) ) {

            const range = key;
            const locations = generateRandomLocations( key );

            try {
              
              locations.forEach( async location => {
                key = location.id.toString();
                value = Buffer.from( JSON.stringify( location.location) );
                await bucket.set( key, value );
              });

              console.log( `Successfully set locations for range: ${range}` )
              
            }

            catch(e) {
              console.error( `Unable to set locations for range ${range}, from driver_id '${key}': ${e.message ? e.message : "Unknown"}` )
            }

          }

          else if ( isId( key ) ) {

            let location  = generateRandomLocation( );
            value = Buffer.from( JSON.stringify( location ) );


            (async() => {

              try {
                await bucket.set( key.toString(), value );
                console.log( `Successfully set location for driver_id: ${key}` );
              }
  
              catch (e) {
                console.error( `Unable to update location for driver_id '${key}': ${e.message ? e.message : "Unknown"}` )
              }
              finally {
                rl.prompt();
              }

            })();
          }

          else {
            console.error( `Invalid key: ${key}. The argument to this command must be either
            a valid driver_id or range of driver_ids`
            .replace( /  +/g, ' ' ) );
          }

          rl.prompt();
          break;

        case "update":

          const range = parsedCommandArgs._[0];
          const time = parsedCommandArgs._[1];

          if (parsedCommandArgs._.length != 2 || Object.keys( parsedCommandArgs ).length > 2 ) {
            console.error( `Invalid arguments. Type 'help' for a list of available commands.` )
          }

          else if ( !_.isNumber( time ) || time < 0 ) {
            console.error( `Invalid arguments. Second argument must be a valid update interval, given in milliseconds. Type 'help' for a list of available commands.` )
          }

          else if ( isRange( range ) || isId( range ) ) {

            setInterval( () => {
              injectLocationUpdates( range, rl );
            }, time );

            console.log( `Scheduled ${time}ms location updates for: ${range}` );
          }

          else {
            console.error( `Invalid range : ${range}. The first argument to this command must be either
            a valid driver_id or range of driver_ids`
            .replace( /  +/g, ' ' ) );
          }

          rl.prompt();
          break;

        case "quit":
          (async () => {

            try {
              bucket.close();
              rl.close();
            } 

            catch (e) {
              console.error( `Error exiting process: ${e.message ? e.message: "Unknown"}` );
            }

            finally {
              process.exit(0);
            }

          })();
          break;
        case "help":
          printHelp();
          rl.prompt();
          break;

        default:
          printHelp();
          rl.prompt();
          break;
      }
    });
  })();
}

/* Debug option, to pause the script before exiting.
 * This is useful when the scripts is run in an interactive
 * terminal which would automatically close otherwise when the process
 * exits (e.g cluster.sh) This option pauses the terminal so you 
 * can read any error messages to determine why the process has stopped,
 * before the termnal closes. */ 

if (_.has(argv, "d")) {
  setTimeout( () => {}, 10000)
}
