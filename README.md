# Beta Mirror Node

This BetaMirrorNode implementation supports CryptoService, FileService and SmartContractService through a proxy.
It can also parse the RecordStream and balance files generated by Hedera nodes.

## Description

Beta mirror node is a temporary mirror node implementation until the Hedera Mirrornet and associated Mirror Nodes receiving gossip about gossip are available.

The Beta mirror node works as follows:

- When a transaction reaches consensus, Hedera nodes add the transaction and its associated record to a record file.
- The file is closed on a regular cadence and a new file is created for the next batch of transactions and records. The interval is currently set to 1 minute but may vary between networks.
- Once the file is closed, nodes generate a signature file which contains the signature generated by the node for the record file.
- Record files also contain the hash of the previous record file, thus creating an unbreakable validation chain.

- The signature and record files are then uploaded from the nodes to Amazon S3 and Google File Storage.

- This mirror node software downloads signature files from either S3 or Google File Storage.
- The signature files are validated to ensure more than 2/3 of the nodes in the address book (stored in a `0.0.102` file) have the same signature.
- For each valid signature file, the corresponding record file is then downloaded from the cloud.
- Record files can then be processed and transactions and records processed for long term storage.

- In addition, nodes regularly generate a balance file which contains the list of Hedera accounts and their corresponding balance which is also uploaded to S3 and Google File Storage.
- The files are also signed by the nodes.
- This mirror node software can download the balance files, validate 2/3rd of nodes have signed and then process the balance files for long term storage.

----

## Quickstart

### Requirements

- [ ] Docker
- [ ] Docker-compose
- [ ] Address book update information:
  - [ ] Node ID - your node of choice (e.g. 0.0.3)
  - [ ] Node Address - IP address and port number of your node of choice (e.g. 35.232.131.251:50211)
  - [ ] Operator ID - Your Hedera Account ID
  - [ ] Operator Secret Key - The secret key that can sign transactions on behalf of your Operator ID.

```
  $> git clone git@github.com:hashgraph/hedera-mirror-node.git
  $> cd hedera-mirror-node
  $> cp config/config.json.sample config/config.json
  $> nano config/config.json
  // Insert AWS S3 credentials. Update any other settings as needed.
  $> cp docker/dotenv.sample docker/.env
  $> nano docker/.env
  // Update database and API settings as needed
  $> ./buildimages.sh

  // You'll now be asked a few questions to finalize automated mirror node configuration.

  Compile source via 1-docker-compose, 2-local maven, 3-skip?
  1) Docker
  2) Local
  3) Skip
  #? 1

  Would you like to update the address book file (0.0.102) from the network (enter 1 or 2)?
  1) Yes
  2) No
  #? 1

  Input node address (x.x.x.x:port)
  {{Node Address}}
  Input node ID (0.0.x)
  {{Node ID}}
  Input operator ID (0.0.x)
  {{Operator ID}}
  Input operator key (302...)
  {{Operator Secret Key}}
```

Follow instructions above for setting up the `config.json` file and the `.env` file in the `docker` folder to ensure environment variables are set correctly.

example `.env` file.

```text
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=mysecretpassword
POSTGRES_PORT=5432
PGDATA=/var/lib/postgresql/data/pgdata
# This user is used by the REST API to gain read only access to the necessary database tables
DB_USER=api
DB_PASS=apipass
DB_NAME=postgres
# This is the port the REST API will listen onto
PORT=5551
```

Containers use persisted volumes as follows:

- `./MirrorNodePostgresData` on your local machine maps to `/var/lib/postgresql/data` in the containers. This contains the files for the PostgreSQL database.
Note: If you database container fails to initialise properly and the database fails to run, you will have to delete this folder prior to attempting a restart otherwise the database initialisation scripts will not be run.

- `./runtime` on your local machine maps to `/MirrorNodeCode` in the containers. This contains the runtime and configuration files for loading and parsing files.
- `./MirrorNodeData` on your local machine maps to `/MirrorNodeData` in the containers. This contains files downloaded from S3 or GCP.

These are necessary not only for the database data to be persisted, but also so that the parsing containers can access file obtained via the downloading containers

Docker compose scripts are available in the `docker` folder. 

A `buildImages.sh` script ensures the necessary data is available to the images via volumes, builds the images and starts the containers.

`buildimages.sh` will first prompt whether youd like to compile sources either using a docker container, your local maven installation or skip the compilation, then prompt whether you want to download the 0.0.102 file from the network (it is recommended you do so the first time).
If you answer 2 (no), the file will not be downloaded, if you answer 1 (yes), you will be prompted for the following information:

-Node address in the format of `ip:port` or `host:port`. (e.g. 192.168.0.2:50211)
-Node ID, the Hedera account for the node (e.g. 0.0.3).
-Operator ID, your account (e.g. 0.0.2031)
-Operator key, the private key for your account

Note: Shutting down the database container via `docker-compose down` may result in a corrupted database that may not restart or may take longer than usual to restart.

In order to avoid this, shell into the container and issue the following command:

Use `docker ps` to get the name of the database container, it should be something like `mirror-node-postgres`.

Use the command `docker exec -it docker_mirror-node-postgres_1 /bin/sh` to get a shell in the container.

`su - postgres -c "PGDATA=$PGDATA /usr/local/bin/pg_ctl -w stop"`

You may now power down the docker image itself.

----

## Prerequisites

This mirror node beta requires Java version 10 or above.
If you are planning on using the docker compose images, you'll need `Docker` installed.
Without `Docker`, you will need to install `PostgreSQL` versions 10 or 11.

## Compile from source code

Run `mvn install -DskipTests` from the `MirrorNode` directory.

This will compile a runnable mirror node jar file in the `target` directory and copy sample `nodesInfo.json.sample`, `config.json.sample` and `log4j2.xml` files into the same directory.

`cd target`

## Change history

Besides bug fixes, some features may have changed with this release which need your attention, these will be listed here.

### buildimages.sh now prompts for project compilation

Prompts to compile either with

- A docker container
- Your local maven 
- Skip

### Moved buildimages.sh script back to root of project

Makes it easier to find

### Removed unnecessary defaultParseDir parameter from config.json

This parameter was not necessary.

### Added prompt to update 0.0.102 file from network during docker build

./buildimages.sh will prompt whether you want to download the 0.0.102 file from the network (it is recommended you do so the first time).
If you answer 2 (no), the file will not be downloaded, if you answer 1 (yes), you will be prompted for the following information:

-Node address in the format of `ip:port` or `host:port`. (e.g. 192.168.0.2:50211)
-Node ID, the Hedera account for the node (e.g. 0.0.3).
-Operator ID, your account (e.g. 0.0.2031)
-Operator key, the private key for your account

### Added class to download and parse record files in one step

This class will download record files and parse the newly downloaded files immediately, then loop back to downloading available record files.

### Increased logging granularity

Each class outputs its category in the common log for ease of debugging.

### Removal of `downloadPeriodSec` parameter from config.json

Download and processing (logging) activities now run in a continuous loop, restarting as soon as they finished to lower the latency for data availability in the database as much as possible.
To gracefully stop a running process, create a file called `stop` in the folder where the application was launched from. 
For example in Unix systems
```
touch stop
```

Remember to remove this file once you are ready to restart the processes.

### All balance logging is now done in a single class

Logging latest balance and balance history is now done sequentially from a single class.

### Performance optimisations to balance tables

Balance tables (t_account_balances and t_balance_history) were using the same t_entities table as other tables for referential integrity.
This lead to contention and deadlocks that could impact latency on delivery of transaction data.
The balance tables are now independent to avoid this resource contention.

### The Address book file automatically refreshes

Changes to the address book file (0.0.102) through fileUpdate transactions now update the 0.0.102 file with the new contents stipulated by the transaction.

### `stopLoggingIfHashMismatch` change

This field was a boolean, it's now a string. See details on configuration files for additional information.

### Database transaction control

Database transactions are now used to ensure a file cannot be partially saved to the database. If an error occurs during file processing, all changes are rolled back.

### Database storage optimisation

The database schema has been changed to maximise denormalisation in order to optimise storage and data integrity.

### Addded `deleted` column on `t_entities`

This column defaults to false on creation, and is set to true when a `delete` transaction is processed. It is unset when an `undelete` transaction is processed.

### Added address book download capability

The address book may be downloaded from the network using this software.

### Addition of a REST api

A REST api written in `node` is now available in this project.

### Switched from individual docker containers to `docker-compose`

See below for instructions

### Creation of a database version table

Added version numbering to the database to make upgrades easier.
The `t_version` table contains the current version of the database.
The upgrade scripts only apply changes that pertain to the current version of the database and update it when complete.

### Additional columns in `t_entities`

Added columns to t_entities to record expiry time, autorenew period, keys and proxy account.

### Database URL as environment parameter

The connection to the database can be specified as an environment variable `HEDERA_MIRROR_DB_URL` or specified via a `.env.` file.

### Added optional persistence of crypto transfers, file contents, contract creation and call results and claim data

See section on configuration for additional details.

### Addition of `stopLoggingIfHashMismatch` configuration item

When processing files after they have been downloaded, this value will determine if a hash mismatch should result in processing stopping. If the currently processed file name is greater than the value stored, processing will stop. Insert the name of the file which failed the hash check in this field in order to allow processing to continue (data loss will result).

### `node-log` has been removed from `log4.xml`

All logging now goes to a single recordStream-log

### Addition of `maxDownloadItems` parameter in config.json file

For testing purposes, this value may be set to a number other than 0. This will limit the number of downloaded files accordingly. If set to 0, all files are downloaded from S3 or GCP.

### Addition of a `postgresUpdate.sql` script

This script contains the incremental changes to the database in the event you need to upgrade an older version of the database to the current version.

### The `t_account_balance_history` table has a new `seconds` column

The `seconds` column contains the number of seconds since epoch in addition to the `snapshot_time` which is a `timestamp`, both contain the same value in different formats.

### Loggers now return true/false depending on success/failure to log

Before this change, failure to log wasn't detected by the class calling the logger which resulted in files being moved when they shouldn't be.

### Addition of cloud storage as an alternative to AWS

It is now possible to specify that files are downloaded from Google Compute Platform storage instead of Amazon S3.
The switch is enabled via the `config/config.json` file.

### Removal of command line arguments

All configuration parameters are now sourced from `./config/config.json` by default, it no longer needs to be specified on the command line.

### Inclusion of logging to PostgreSQL database

The `recordFileLogger`, `balanceFileHistoryLogger` and `balanceFileLogger` write transactions, records and balances to a PostgreSQL database. The scripts for creating the database are provided in the `postreSQL` folder.

### Amazon Hedera S3 access keys

Access and secret keys to Hedera's Amazon S3 bucket may now be specified via environment variables or a `./.env` file

### Configuration files

All configuration files now reside in the `./config` folder.

### new `Config.json` `downloadPeriodSec` parameter

If set to 0, the downloader will download available files and exit.
If set to another value, the downloader will download available files, wait `downloadPeriodSec` and start downloading new files again until it is stopped by the operator (`kill or ctrl-c`).

### Logging

Previous versions of the mirror node software embedded a `log4j2.xml` file in the jar, this is no longer the case, so by default, no logging will take place.
Should you wish to enable logging, copy the `log4j2.xml` file from `src/main/resources` or `target` to the same location as the `mirrorNode.jar` file, edit accordingly and include the following in your `java` command:

```shell
    -Dlog4j.configurationFile=./log4j2.xml
```

for example

```shell
    java -Dlog4j.configurationFile=./log4j2.xml -cp mirrorNode.jar com.hedera.recordFileParser.RecordFileParser
```

This will ensure that the `log4j2.xml` file is used to direct logging accordingly.

If you do not specify a `log4j2.xml`, the following error will be output but will not prevent the software from operating.

```code
ERROR StatusLogger No Log4j 2 configuration file found. Using default configuration (logging only errors to the console), or user programmatically provided configurations. Set system property 'log4j2.debug' to show Log4j 2 internal initialization logging. See https://logging.apache.org/log4j/2.x/manual/configuration.html for instructions on how to configure Log4j 2
```

## Setup your environment

The build process has copied sample files to the `target/config` or the `/runtime/config` folder depending on whether you are running locally or via `docker-compose`.

- `nodesInfo.json.sample` - rename this file to `nodesInfo.json` and edit so that the appropriate nodes are listed.
- `config.json.sample` - rename this file to `config.json` and edit so that the configuration parameters that are appropriate to your environment are setup. See section below on configuration file specifics.

- the file prefixed with '0.0.102' is the contents of a file hosted on Hedera with file ID `0.0.102`. This file contains the address book from the Hedera network which lists nodes and their public keys for signature verification purposes. Ensure the appropriate one for your network is identified in the `config.json` file (addressBookFile entry) otherwise signature verification will fail.

Pay close attention to the contents of these configuration files, they directly affect how the mirror node operates.

### nodesInfo.json

This file contains the list of nodes for which you want to download files from and the list of nodes which the proxy can send transactions to.

For example:

```json
{
  "0.0.3": {
    "host": "127.0.0.1",
    "port": 50211
  },
  "0.0.4": {
    "host": "127.0.0.2",
    "port": 50211
  },
  "0.0.5": {
    "host": "127.0.0.3",
    "port": 50211
  },
  "0.0.6": {
    "host": "127.0.0.4",
    "port": 50211
  }
}
```

Edit the `./config/nodesInfo.json` file to match the nodes on the network you are running mirror node against.

### 0.0.102 file

The `0.0.102` file contains the address book, that is the list of nodes, their account number and public key(s). This file is different on every network so it is imperative to ensure you have the correct one for each network, else the signature verification process will fail.

#### Creating or updating the address book file (0.0.102 file)

Set the following environment variables or add them to a `.env` file.

```text
NODE_ADDRESS=127.0.0.1:50211
NODE_ID=0.0.x
OPERATOR_ID=0.0.x
OPERATOR_KEY=your account's private key
```

`NODE_ADDRESS` is the IP address/url + port of the node you wish to request the file from.
`NODE_ID` is the account number of the node (0.0.x).
`OPERATOR_ID` is your own account number on the network (0.0.x).
`OPERATOR_KEY` is your private key for the above account.

Run the following command to update the address book at the location specified in `config.json`.

```shell
java -Dlog4j.configurationFile=./log4j2.xml -cp mirrorNode.jar com.hedera.addressBook.NetworkAddressBook 
```

If no errors are output, the file specified by the `addressBookFile` parameter of the `config.json` file will now contain the network's address book.

Once setup, the file will be automatically updated as the mirror node software parses fileUpdate transactions that pertain to this file.

### config.json

Note: Changes to this file while downloading or processing is taking place may be overwritten by the software. Make sure all processes are stopped before making changes.

| Parameter name  | Default value  | Description  |
|---|---|---|
| cloud-provider | `"S3"` | Either `S3` or `GCP` depending on where you want to download files from |
| clientRegion | `"us-east-2"` | The region which you want to download from |
| bucketName | `"hedera-export"` | The name of the bucket containing the files to download |
| accessKey | `""` | Your S3 or GCP access key |
| secretKey | `""` | Your S3 or GCP secret key |
| downloadToDir | `"/MirrorNodeData"` | The location where downloaded files will reside |
| proxyPort | `50777` | The port the mirror node proxy will listen onto |
| nodeInfoFile | `"./config/nodesInfo.json"` | The location of the `nodesInfo.json` file |
| addressBookFile | `"./config/0.0.102"` | The location of the address book file file |
| accountBalancesS3Location | `"accountBalances/balance"` | The location of the account balances files in the cloud bucket |
| recordFilesS3Location | `"recordstreams/record"` | The location of the record files in the cloud bucket |
| dbUrl | `"jdbc:postgresql://localhost:5433/postgres"` | The connection string to access the database |
| dbUsername | `"postgres"` | The username to access the database |
| dbPassword | `"mysecretpassword"` | The password to access the database |
| maxDownloadItems | `0` | The maximum number of new files to download at a time, set to `0` in production, change to `10` or other low number for testing or catching up with a large number of files. Note, you may also reduce the number of nodes in `nodesInfo.json` so that only files from the nodes listed will be downloaded, although this reduces the number of signature validations too |
| stopLoggingIfHashMismatch | "" | If you wish to skip past a file as a result of a hash mismatch, you can input the name of the record file before which hash mismatches will be ignored. e.g. `2019-06-12T18/05/22.198241001Z.rcd` will allow hash mismatches on any files prior to that file name, after this file, a hash mismatch will result in an error being logged and processing to stop.
| persistClaims | `false` | Determines whether claim data is persisted to the database or not |
| persistFiles | `"ALL"` | Determines whether file data is persisted to the database or not, can be set to `ALL`, `NONE` or `SYSTEM`. `SYSTEM` means only files with a file number lower than `1000` will be persisted |
| persistContracts | `true` | Determines whether contract data is persisted to the database or not |
| persistCryptoTransferAmounts | `true` | Determines whether crypto transfer amount data is persisted to the database or not |

The following environment variables may be used instead of values in the `config.json` file for additional security.
Environment variables if set will take precedence over values in the `config.json` file.
Environment variables may be set through the command line `export varname=value` or via a `.env` file located in the folder where the java classes are executed from

Note: this requires additional information to be stored in the `config.json`, `.env` or environment variables as follows:

| json parameter name | corresponding environment variable |
|---------------------|------------------------------------|
| dbUsername | HEDERA_MIRROR_DB_USER |
| dbPassword | HEDERA_MIRROR_DB_PASS |
| accessKey | HEDERA_S3_ACCESS_KEY |
| secretKey | HEDERA_S3_SECRET_KEY |


Sample `./.env` file.

```text
HEDERA_S3_ACCESS_KEY=accessKey
HEDERA_S3_SECRET_KEY=secretKey
```

### loggerStatus.json

This isn't strictly speaking a configuration file, it is created at runtime by the mirror node software and holds the hash of the last successfully parsed file. It is held in a separate file to `config.json` to ensure downloads and processing don't overwrite each-other's changes.

## Installing the database

You can skip this step if you're using Docker containers.

Ensure you have a postgreSQL server running (versions 10 and 11 have been tested) with the mirror node software.

Setup the following environment variables:

```text
POSTGRES_DB = the name of the database you wish to create
POSTGRES_USER = the name of the user you wish to create
POSTGRES_PASSWORD = the password for the user above
```

You will also need to uncomment a few lines to enable the creation of the database and user as described in the `src/main/resources/postgres/postgresInit.sql` script.
Log into the database as an administrator and run the `src/main/resources/postgres/postgresInit.sql` script to create the database and necessary entities.

Make sure the `config/config.json` or `.env` file have values that match the above.

Check the output of the script carefully to ensure no errors occurred.

## Upgrading the database

If you have already installed the database and wish to upgrade it, you may run the `src/main/resources/postgres/postgresUpdate.sql` script against your database.

Ensure you change the default values in the first few lines of this script to match your environment.

Check the output of the script carefully to ensure no errors occurred.

## Running the various mirror node components

You can skip this section if you're running docker containers.

### Note about error when running the software

The error below may appear on the console when running the `.jar` file, this is normal and nothing to be concerned about.

```code
WARNING: An illegal reflective access operation has occurred
WARNING: Illegal reflective access by com.google.protobuf.UnsafeUtil (file:/home/greg/mirrornode/lib/protobuf-java-3.5.1.jar) to field java.nio.Buffer.address
WARNING: Please consider reporting this to the maintainers of com.google.protobuf.UnsafeUtil
WARNING: Use --illegal-access=warn to enable warnings of further illegal reflective access operations
WARNING: All illegal access operations will be denied in a future release
```

### To Run BetaMirrorNode Proxy

*Note: The beta mirror node proxy doesn't select nodes by itself, rather it inspects the transactions it receives, extracts the target node information from the transaction (`NodeAccountID` from `transactionBody`) and forwards the transaction to this node.*

Run the following command:

```shell
java -jar mirrorNode.jar
```

### To Download RecordStream file(s)

Run the following command:

```shell
java -cp mirrorNode.jar com.hedera.downloader.RecordFileDownloader
```

Record files and signature files will be downloaded from S3 to the location specified in the `config.json` file.

### To Download Balance file(s)

Run the following command:

```shell
java -cp mirrorNode.jar com.hedera.downloader.AccountBalancesDownloader
```

Balance files will be downloaded from S3 to the location specified in the `config.json` file.

Example file

```text
year,month,day,hour,minute,second
2019,JUNE,28,17,29,17
shard,realm,number,balance
0,0,1,0
0,0,2,4530999689861900540
... continues
```

### To Parse RecordStream file(s)

Run the following command:

```shell
java -cp mirrorNode.jar com.hedera.recordFileParser.RecordFileParser
```

### To Parse Balance file(s)

This project provides the ability to log balances for all accounts, including history of balance changes

Run the following command:

```shell
java -Dlog4j.configurationFile=./log4j2.xml -cp mirrorNode.jar com.hedera.balanceFileLogger.BalanceFileLogger 
```

### To download and parse record files in one command

```shell
java -Dlog4j.configurationFile=./log4j2.xml -cp mirrorNode.jar com.hedera.downloader.DownloadAndParseRecordFiles
```

### To Send Transactions or Queries to the BetaMirrorNode Proxy

Using a client which is able to generate and send transactions to a Hedera node, update the configuration of the client application such that it sends its transactions to the proxy host and port instead of a Hedera node.

## Docker compose

Docker compose scripts are provided and run all the mirror node components:

- PostgreSQL database
- Balance files downloader
- Balance files processor
- Record files downloader and parser
- 102 file updater
- REST API

## REST API

A REST API to the database is available under `rest-api`.

To start it, `cd rest-api` then `npm install`.

Create a `.env` file as per below and run with `npm start`.

You can also unittest using jest by using `npm test`.

example `.env` file:

```TEXT
DB_USER=api
DB_PASS=apipass
DB_NAME=postgres
# This is the port the REST API will listen onto
PORT=5551
# server hosting the database
DB_HOST=localhost
```

`PORT` is the port number the REST API will listen onto.

## If things don't appear to be working properly

### Checking for errors

Set log levels to WARN as a minimum to start with. INFO is very verbose.

Check for errors in the `output/recordStream.log` file.

### Record files

* Recordstream files that have successfully been validated against signatures will be placed in the `"downloadToDir"/recordstreams/valid` directory.
If there are no files in this folder, it's possible that either you `0.0.102` file is incorrect for this network, or signature files are still being downloaded.

* Recordstream files that have successfully been parsed will be moved to `"downloadToDir"/recordstreams/parsedRecordFiles'

* If your `maxDownloadItems` is set to 0 in the `config.json` file, the docker image downloads all new signature files from all nodes before starting processing into the database. If there are many files to catch up, it may be a long while before processing of these files takes place.
You may try to set the `maxDownloadItems` to a number such as 10 or 20 to download and process new files in batches.

* The above also applies if you are running the `downloader.DownloadAndParseRecordFiles` java class.

