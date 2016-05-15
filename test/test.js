var Lab = require('lab')
var winston = require('winston');
var Seneca = require('seneca');

winston.level = "debug";

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;

var temp = require('temp');
var fs = require('fs');


describe('#seneca-rancher-module', function ()
{
	it('multi test', {parallel: false}, function (done)
	{
		var s0 = Seneca({})
			.listen({port: '47112', type: 'tcp'})
			.add({role: 'test1'}, function (args, done)
			{
				winston.log("debug", "test1 in server invoked");
				done(null, {result: "ok"});
			});
		var s1 = Seneca({})
			.listen({port: '47113', type: 'tcp'})
			.add({role: 'test2'}, function (args, done)
			{
				winston.log("debug", "test2 in server invoked");
				done(null, {result: "ok"});
			});

		var r = 0;

		function fin(done)
		{
			r++;
			if (r == 2) done();
		}

		temp.track();
		temp.open('srm-test', function (err, info)
		{
			if (!err)
			{
				fs.write(info.fd, JSON.stringify([{"primary_ip": "127.0.0.1"}]));
				fs.close(info.fd, function (err)
				{
					var c0 = Seneca({});
					c0.use(require("seneca-balance-client"))
						.client({type: 'balance', pin: 'role:test1'})
						.client({type: 'balance', pin: 'role:test2'});
					c0.use('..', {opts: [{pin: 'role:test1', localfile: info.path, port: 47112}, {pin: 'role:test2', localfile: info.path, port: 47113}]});
					setTimeout(function ()
					{
						c0.act({role: "test1"}, function (err, result)
						{
							if (result.result == 'ok')
							{
								console.log("ok from 1", info.path);
								fs.open(info.path, 'w', function (err, fd)
								{
									if (!err)
									{
										fs.write(fd, JSON.stringify([{"primary_ip": "localhost"}]));
										fs.close(fd, function (err)
										{
											setTimeout(function ()
											{
												c0.act({role: "test1"}, function (err, result)
												{
													if (result.result == 'ok')
													{
														console.log("ok2");
														fin(done);
													}
													else done(new Error('fail'));
												});
											}, 2000);
										});
									}
								});
							}
							else done(new Error('fail'));
						});
						c0.act({role: "test2"}, function (err, result)
						{
							if (result.result == 'ok')
							{
								console.log("ok from 2");
								setTimeout(function ()
								{
									c0.act({role: "test1"}, function (err, result)
									{
										if (result.result == 'ok')
										{
											console.log("ok2");
											fin(done);
										}
										else done(new Error('fail'));
									});
								}, 3000);
							}
							else done(new Error('fail'));
						});
					}, 2000);
				});
			}
		});
	});

	it('localfile test', {parallel: false}, function (done)
	{
		var s0 = Seneca({})
			.listen({port: '47111', type: 'tcp'})
			.add({role: 'test'}, function (args, done)
			{
				winston.log("debug", "test in server invoked");
				done(null, {result: "ok"});
			});

		temp.track();
		temp.open('srm-test', function (err, info)
		{
			if (!err)
			{
				fs.write(info.fd, JSON.stringify([{"primary_ip": "127.0.0.1"}, {"primary_ip": "localhost"}]));
				fs.close(info.fd, function (err)
				{
					var c0 = Seneca({});
					c0.use(require("seneca-balance-client")).client({type: 'balance', pin: 'role:test'});
					c0.use('..', {pin: 'role:test', localfile: info.path, port: 47111});
					setTimeout(function ()
					{
						c0.act({role: "test"}, function (err, result)
						{
							if (result.result == 'ok')
							{
								fs.open(info.path, 'w', function (err, fd)
								{
									if (!err)
									{
										fs.write(fd, JSON.stringify([{"primary_ip": "127.0.0.1"}]));
										fs.close(fd, function (err)
										{
											setTimeout(function ()
											{
												c0.act({role: "test"}, function (err, result)
												{
													if (result.result == 'ok')
													{
														fs.open(info.path, "w", function (err, fd)
														{
															if (!err)
															{
																fs.write(fd, JSON.stringify([{"primary_ip": "localhost"}]));
																fs.close(fd, function (err)
																{
																	setTimeout(function ()
																	{
																		c0.act({role: "test"}, function (err, result)
																		{
																			if (result.result == 'ok')
																			{
																				done();
																			}
																			else done(new Error('fail'));
																		});
																	}, 2000);
																});
															}
														});
													}
													else done(new Error('fail'));
												});
											}, 2000);
										});
									}
								});
							}
							else done(new Error('fail'));
						});
					}, 2000);
				});
			}
		});
	});
});
