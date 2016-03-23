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
        var previousTime;

		function getData()
		{
            var currentTime = new Date().getTime();
            var refresh_time = currentSettings.refresh_time;
            var delta = (currentTime - previousTime) > refresh_time ? currentTime - previousTime : refresh_time; 
            
            var url = "http://";
            url += currentSettings.rest;

            //
            // {"$gt"|"$gte"|"$eq"|"$date":"$latest"}
            // replace "$latest" with previous tick time
            // 
            var regexp = /\{\s*(['"])(\$gt|\$gte|\$eq|\$date)['"]\s*:\s*(['"]\$latest['"])\s*\}/g;
            var rest_api = currentSettings.rest_api;
            url += rest_api.replace(regexp, function(match, p1, p2, p3, offset, string) {
                if (p2 == "$gt" || p2 == "$gte" || p2 == "$eq") {
                    // var thresholdTime = currentTime - refresh_time;
                    var thresholdTime = currentTime - delta;
                    return "{" + p1 + p2 + p1 + ":" + thresholdTime + "}";
                } else if (p2 == "$date") {
                    // var thresholdTime = new Date(currentTime - refresh_time).toISOString();
                    var thresholdTime = new Date(currentTime - delta).toISOString();
                    return "{" + p1 + p2 + p1 + ":" + p1 + thresholdTime +p1 + "}";
                } else {
                    return match;
                }
            });
            console.log("url:" + url);

            var rest = require('rest/client/xhr');
            var defaultRequest = require('rest/interceptor/defaultRequest');
            var client = rest.wrap(defaultRequest, {method: 'GET', headers:{'Content-Type':'application/json'}});
            client(url).then(function(response) {
                console.log("update Freeboard");

                var message = JSON.parse(response.entity);
                updateCallback(message);
                console.log("thresholdTime=" + new Date(currentTime - delta));
                var diff = message["_embedded"]["rh:doc"][0]["header"]["timestamp"]["long"]-(currentTime - delta);
                console.log("dTimestamp   =" + diff.toString());
            });

            previousTime = currentTime;
		}

		var refreshTimer;

		function createRefreshTimer(interval)
		{
			if(refreshTimer)
			{
				clearInterval(refreshTimer);
			}

            previousTime = new Date().getTime();
			refreshTimer = setInterval(function()
			{
				getData();
			}, interval);
		}

		self.onSettingsChanged = function(newSettings)
		{
            console.log("onSettingsChanged");
			currentSettings = newSettings;
            createRefreshTimer(currentSettings.refresh_time);
		}

		self.updateNow = function()
		{
            console.log("updateNow");
			getData();
		}

		self.onDispose = function()
		{
            console.log("onDispose");
			clearInterval(refreshTimer);
			refreshTimer = undefined;
		}
		createRefreshTimer(currentSettings.refresh_time);
	}
}());
