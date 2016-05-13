"use strict";

var winston = require('winston');

module.exports = function (options)
{
	var plugin = "seneca-rancher-balance";
	var currentNodes = [];

	function getMetaData(cb, options)
	{
		var request = require('request');
		if (options.service && !options.localfile)
		{
			var opts = {
				url: "http://rancher-metadata/latest/self/stack/services/" + options.service + "/containers",
				headers: {
					'Accept': 'application/json'
				}
			};
			request(opts, function (error, response, body)
			{
				if (!error && response.statusCode == 200)
				{
					cb(JSON.parse(body));
				}
				else
				{
					cb([]);
				}
			});
		}
		else
		{
			var fs = require('fs');
			fs.readFile(options.localfile || 'rancher-metadata.json', function (err, data)
			{
				if (err)
				{
					throw err;
				}
				var result = JSON.parse(data.toString());
				cb(result);
			});
		}
	}

	function clientIndexOf(arr, o)
	{
		for (var i = 0; i < arr.length; i++)
		{
			if (arr[i].host == o.host && arr[i].port == o.port)
			{
				return i;
			}
		}
		return -1;
	}

	function removeArrayItems(itemsToRemove, array)
	{
		var usedArray = JSON.parse(JSON.stringify(array));
		for (var _i = 0, _a = JSON.parse(JSON.stringify(itemsToRemove)); _i < _a.length; _i++)
		{
			var i = _a[_i];
			var index = clientIndexOf(usedArray, i);
			if (index != -1)
			{
				usedArray.splice(index, 1);
			}
		}
		return usedArray;
	}

	this.add({plugin: plugin, cmd: 'alive'}, function (args, done)
	{
		getMetaData(function (obj)
		{
			if (obj)
			{
				var result = [];
				for (var _i = 0, obj_1 = obj; _i < obj_1.length; _i++)
				{
					var i = obj_1[_i];
					result.push({host: i.primary_ip, port: options.port || 4711});
				}
				done(null, result);
			}
			else
			{
				winston.log("error", "error getting metadata");
				done("error getting metadata", []);
			}
		}, options);
	});

	this.add({plugin: plugin, cmd: 'add'}, function (args, done)
	{
		var $this = this;
		var result = [];
		var doOne = function (client, allClients)
		{
			$this.act('role:transport,type:balance,add:client', {
				config: {type: 'tcp', host: client.host, port: client.port, pin: options.pin}
			}, function ()
			{
				result.push(client);
				if (allClients.length > 0)
					doOne(allClients.pop(), allClients);
				else
					done(null, result);
			});
		};
		if (args.hosts.length > 0)
			doOne(args.hosts.pop(), args.hosts);
		else
			done(null, []);
	});

	this.add({plugin: plugin, cmd: 'remove'}, function (args, done)
	{
		var $this = this;
		var result = [];
		var doOne = function (client, allClients)
		{
			$this.act('role:transport,type:balance,remove:client', {
				config: {type: 'tcp', host: client.host, port: client.port, pin: options.pin}
			}, function ()
			{
				result.push(client);
				if (allClients.length > 0)
					doOne(allClients.pop(), allClients);
				else
					done(null, result);
			});
		};
		if (args.hosts.length > 0)
			doOne(args.hosts.pop(), args.hosts);
		else
			done(null, []);
	});

	this.add({plugin: plugin, cmd: 'ha-check'}, function (args, done)
	{
		this.act({plugin: plugin, cmd: 'alive'}, function (err, nodes)
		{
			var added = removeArrayItems(currentNodes, nodes);
			var removed = removeArrayItems(nodes, currentNodes);
			if (removed.length != 0 || added.length != null)
			{
				if (added.length > 0)
					this.act({plugin: plugin, cmd: 'add', hosts: added}, function (err, result)
					{
						for (var _i = 0, obj_1 = result; _i < obj_1.length; _i++)
						{
							var i = obj_1[_i];
							winston.log("debug", "added new host: ", i);
						}
					});
				if (removed.length > 0)
					this.act({plugin: plugin, cmd: 'remove', hosts: removed}, function (err, result)
					{
						for (var _i = 0, obj_1 = result; _i < obj_1.length; _i++)
						{
							var i = obj_1[_i];
							winston.log("debug", "removed host: ", i);
						}
					});
				currentNodes = nodes;
			}
			done();
		});
	});

	this.add({init: plugin}, function (args, done)
	{
		winston.log("debug", 'init plugin');
		var $this = this;
		this.act({plugin: plugin, cmd: 'alive'}, function (err, nodes)
		{
			setInterval(function ()
			{
				$this.act({plugin: plugin, cmd: 'ha-check'}, function (err, result)
				{
					if (err) winston.error(err);
				});
			}, 1000);
			done();
		});
	});
	return plugin;
};
