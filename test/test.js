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
