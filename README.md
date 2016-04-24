# Freeboard-plugin-for-MongoDB
A Freeboard plugin for MongoDB.

This plugin enables Freeboard to retrieve latest data for every specified interval from MongoDB via the RESTHeart a REST API server for MongoDB.

Refer to [Freeboard GitHub] (https://github.com/Freeboard/freeboard) for Freeboard specifics.

Refer to [MongoDB GitHub] (https://github.com/mongodb/mongo) for MongoDB specifics.

##Prerequisites
###Server side
* [RESTHeart](http://restheart.org)

###Development environment to build this plugin
* [Node.js](https://nodejs.org/en/)
* [Browserify](http://browserify.org)
* [UglifyJS](https://github.com/mishoo/UglifyJS)


##Install
To make this plugin, execute the following commands.
```sh
$ git clone https://github.com/Hitachi-Data-Systems/Freeboard-plugin-for-MongoDB.git
$ npm install
$ ls mongodb.plugin.js
mongodb.plugin.js
```

To load the plugin in your Freeboard, copy to "mongodb.plugin.js" to your plugin folder for Freeboard, and add it to the list in your index.html used to initialize Freeboard.  Below is an example of index.html to load this plugin.
```html
<script type="text/javascript">
        head.js("js/freeboard_plugins.min.js",
                "plugins/thirdparty/mongodb.plugin.js",
                // *** Load more plugins here ***
                function(){
                    $(function()
                    { //DOM Ready
                        freeboard.initialize(true);
						...
                    });
                });
```

##Usage
Choose the data source "MongoDB".

###NAME
Name the data source.

###REST SERVER
Specify the hostname/address and port of your RESTHeart server where your RESTHeart server binds. 

###REST API
Specify a REST API query according to RESTHeart query format to retrieve data from MongoDB via RESTHeart server.  Below is an example of query:
```uri
/kaa/logs_48635001004582290736/?count&sort_by=-header.timestamp&pagesize=1
```
This plugin supports an additional filtering operator "$latest" adding to the operators supported by RESTHeart.
The $latest operator is interpreted as time, which is your specified refresh time behind than current time.
This operator must be specified with the following filtering operators.
```text
"$gt", "$gte", "$eq", "$date"
```
Below is an example of query with a filtering operator:
```text
/kaa/logs_48635001004582290736/?filter={"header.timestamp.long":{"$gt":"$latest"}}
```

###REFRESH TIME
Specify an interval of refresh timer used to retrieve data and update Freeboard.


![Add Datasource](./docs/freeboard_datasource.png)
