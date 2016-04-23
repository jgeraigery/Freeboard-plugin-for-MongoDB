//Copyright (c) 2016 Hitachi Data Systems, Inc.
//All Rights Reserved.
//
//   Licensed under the Apache License, Version 2.0 (the "License"); you may
//   not use this file except in compliance with the License. You may obtain
//   a copy of the License at
//
//         http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
//   WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
//   License for the specific language governing permissions and limitations
//   under the License.
//
//Author: Reiji Nishiyama <reiji.nishiyama@hds.com>
//

(function()
{
    freeboard.loadDatasourcePlugin({
        "type_name"   : "mongodb_datasource_plugin",
        "display_name": "MongoDB",
        "description" : "Retrieve document from a mongo server with rest api.",
        "external_scripts" : [
            ""
        ],
        "settings"    : [
            {
                "name"          : "rest",
                "display_name"  : "REST server",
                "type"          : "text",
                "description"   : "RESTHeart server \"hostname:port\"",
                "required"      : true
            },
            {
                "name"          : "rest_api",
                "display_name"  : "REST API",
                "type"          : "text",
                "required"      : true,
                "description"   : "/?filter='\{\"property\"\:\"value\"\}'"
            },
            {
                "name"         : "refresh_time",
                "display_name" : "Refresh Time",
                "type"         : "text",
                "description"  : "In milliseconds",
                "default_value": 1000
            }
        ],
        newInstance   : function(settings, newInstanceCallback, updateCallback)
        {
            newInstanceCallback(new MongodbDatasourcePlugin(settings, updateCallback));
        }
    });


    var MongodbDatasourcePlugin = function(settings, updateCallback)
    {
        var self = this;

        var currentSettings = settings;

        // The getData() is to retrieve latest data within the specified time window as "Refresh Time" from MongoDB.
        function getData()
        {
            var currentTime = new Date().getTime();
            var refresh_time = currentSettings.refresh_time;

            // The url has an url as a REST API of RESTHeart to retrieve data, which is a REST API server for MongoDB.
            var url = "http://";
            url += currentSettings.rest;

            //
            // Support the following operators used for filtering data in a MongoDB collection.
            // {"$gt"|"$gte"|"$eq"|"$date":"$latest"}
            //
            // The $gt, $gte, $eq and $date operators are from RESTHeart and handled by RESTHeart.
            // The $latest operator is added and handled by this plugin. It is replaced with a time in interger value or ISO string format.
            // 
            var regexp = /\{\s*(['"])(\$gt|\$gte|\$eq|\$date)['"]\s*:\s*(['"]\$latest['"])\s*\}/g;
            var rest_api = currentSettings.rest_api;
            url += rest_api.replace(regexp, function(match, p1, p2, p3, offset, string) {
                if (p2 == "$gt" || p2 == "$gte" || p2 == "$eq") {
                    // If $latest is specified with $gt, $gte or $eq, then replace it with an interger value representing a previous expiration time.
                    var thresholdTime = currentTime - refresh_time;
                    return "{" + p1 + p2 + p1 + ":" + thresholdTime + "}";
                } else if (p2 == "$date") {
                    // If $latest is specified with $date, then replace it with a string in ISO format representing a previous expiration time.
                    var thresholdTime = new Date(currentTime - refresh_time).toISOString();
                    return "{" + p1 + p2 + p1 + ":" + p1 + thresholdTime +p1 + "}";
                } else {
                    return match;
                }
            });

            // Import rest api modules provided by the external package "rest".
            var rest = require('rest/client/xhr');
            var defaultRequest = require('rest/interceptor/defaultRequest');
            var client = rest.wrap(defaultRequest, {method: 'GET', headers:{'Content-Type':'application/json'}});

            // Invoke a REST API of RESTHeart to retrieve data.
            client(url).then(function(response) {
                var message = JSON.parse(response.entity);
                if (message._returned > 0) {
                    // Pass data to Freeboard.
                    updateCallback(message);
                }
            });
        }

        // Create an interval timer to update Freeboard view with latest data every the interval specified by "Refresh Time".
        var refreshTimer;

        function createRefreshTimer(interval)
        {
            if(refreshTimer)
            {
                clearInterval(refreshTimer);
            }

            refreshTimer = setInterval(function() {
                getData();
            }, interval);
        }

        self.onSettingsChanged = function(newSettings)
        {
            currentSettings = newSettings;
            createRefreshTimer(currentSettings.refresh_time);
        }

        self.updateNow = function()
        {
            getData();
        }

        self.onDispose = function()
        {
            clearInterval(refreshTimer);
            refreshTimer = undefined;
        }
        createRefreshTimer(currentSettings.refresh_time);
    }
}());
