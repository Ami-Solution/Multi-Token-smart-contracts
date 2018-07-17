/*global contract, config, it, assert, web3*/
const STKChannel = require('Embark/contracts/STKChannel');
const ERC20Token = require('Embark/contracts/ERC20Token');
const STKLibrary = require('Embark/contracts/STKLibrary');
const indexes = require('./helpers/ChannelDataIndexes.js')
const StandardToken = require('Embark/contracts/StandardToken.sol');
const Token = require('Embark/contracts/Token.sol');
const closingHelper = require('./helpers/channelClosingHelper');
const assertRevert = require('./helpers/assertRevert');


contract("Testing STKChannel", function () {
    this.timeout(0);
    let allAccounts;
    const timeout = 10;
    const initialCreation = 1000000000;
    const signersPk = Buffer.from('f4ebc8adae40bfc741b0982c206061878bffed3ad1f34d67c94fa32c3d33eac8', 'hex');
    
    config({
        deployment: {
            "host": "localhost",
            "port": 8545,
            "type": "rpc"
        }
    });
    
    before(function(done) {
        web3.eth.getAccounts(function (err, accounts) {
            if (err) {
                return done(err);
            }
            config({
                "deployment": {
                    "host": "localhost",
                    "port": 8555,
                    "type": "rpc",
                    "accounts": [
                        // {
                        //     "privateKeyFile": "test/helpers/privateKeys.js" // You can put more than one key, separated by , or ;
                        // },
                        // {
                        //     "mnemonic": "example exile argue silk regular smile grass bomb merge arm assist farm",
                        //     "addressIndex": "0", // Optional. The index to start getting the address
                        //     "numAddresses": "10", // Optional. The number of addresses to get
                        // }
                    ]},
                    contracts: {
                        "Token": {
                            
                        },
                        "StandardToken": {
                            
                        },
                        "WETHToken": {
                            args:[initialCreation, "WETH", 18, "STK"],
                            "instanceOf": "ERC20Token",
                            "fromIndex":3
                        },
                        "ERC20Token": {
                            args: [initialCreation,'STK', 18, 'STK'],
                            "fromIndex":3
                        },
                        STKLibrary: {
                            args: [
                                '$ERC20Token',
                                accounts[0],
                                accounts[2],
                                accounts[1],
                                timeout,
                                1,
                                0,
                                0
                            ],
                            "fromIndex":1
                        },
                        "STKChannel": {
                            args: [
                                accounts[0],
                                accounts[2],
                                '$ERC20Token',
                                timeout
                            ],
                            "fromIndex":1
                        }
                    }
                }, done);
                allAccounts = accounts;
            });
        });
        
        it("STK Channel balance should be 50 after transferring 50 tokens",async() =>
        {
            const transfer = 50;
            await ERC20Token.methods.approve(STKChannel.options.address,transfer).send({from: allAccounts[3]});
            await ERC20Token.methods.transfer(STKChannel.options.address, transfer).send({from: allAccounts[3]});
            const initialCreatorBalance = await ERC20Token.methods.balanceOf(allAccounts[3]).call();
            const stkchannelBalance = await ERC20Token.methods.balanceOf(STKChannel.options.address).call();
            
            assert.equal(stkchannelBalance.valueOf(), transfer, "STKChannel should have 50 tokens after transfer but does not");
            assert.equal(initialCreatorBalance.valueOf(), (initialCreation-transfer).valueOf(), "Initial creator should have transferred amount of tokens removed from account");
        })
        
        it("User should not be able to close channel with amount greater than deposited amount",async() =>
        {
            const nonce = 1;
            const amount = 10000;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, STKChannel.options.address, signersPk);
            
            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send();
                assert.fail("The incorrect amount should have caused an exception to be thrown");
            }
            catch (error)
            {
                assertRevert(error);
                assert.ok(true);
            }
            
        })
        
        it("User should not be able to close a channel with self-signed signature" ,async() =>
        {
            const nonce = 1;
            const amount = 2;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send();
                assert.fail("Incorrect signature (self-signed) should not be allowed");
            }
            catch (error)
            {
                assertRevert(error);
                assert.ok(true);
            }
            
        });
        
        it("Non-channel participant should not be able to close the channel with a valid signature", async() =>
        {
            const nonce = 1;
            const amount = 2;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:allAccounts[6]});
                assert.fail("Incorrect signature (self-signed) should not be allowed");
            }
            catch (error)
            {
                assertRevert(error);
                assert.ok(true);
            }
        });
        
        it("User should be allowed to close the channel with a valid signature", async() =>
        {
            const nonce = 2;
            const amount = 0;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:allAccounts[1]});
            const data  = await STKChannel.methods.getChannelData(ERC20Token.options.address).call();
            
            const closedNonce = data[indexes.CLOSED_NONCE];
            const closedBlock = data[indexes.CLOSED_BLOCK];
            
            assert.equal(parseInt(closedNonce),nonce,"Nonces should be equal");
            assert.notEqual(parseInt(closedBlock),0,"Closed block should not be set to 0");
        });
        
        it("Should fail when we try to settle the address before the time period expiry", async() =>
        {
            var dataBefore;
            var dataAfter;
            try
            {
                dataBefore  = await STKChannel.methods.getChannelData(ERC20Token.options.address).call();
                await STKChannel.methods.settle(ERC20Token.options.address,false).send({from:allAccounts[1]});
                assert.fail("Participant should not be able to settle before time period is over");
            }
            catch (error)
            {
                dataAfter  = await STKChannel.methods.getChannelData(ERC20Token.options.address).call();
                assert.strictEqual(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf()),parseInt(dataAfter[indexes.AMOUNT_OWED].valueOf()),"Amount owed should not have been reset");
                assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE].valueOf()),parseInt(dataAfter[indexes.CLOSED_NONCE].valueOf()),"Closed nonce should not have changed");
                assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_BLOCK].valueOf()),parseInt(dataAfter[indexes.CLOSED_BLOCK].valueOf()),"Closed block should not have changed");
                assertRevert(error);
            }
        });
        
        it("Library should not allow you to close a channel that does not exist", async() =>
        {
            const nonce = 2;
            const amount = 0;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            try
            {
                await STKChannel.methods.close(allAccounts[6],nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:allAccounts[6]});
                assert.fail("Should not be able to close invalid token address");
            }
            catch (error)
            {
                assertRevert(error);
                assert.ok(true);
            }
        });
        
        it("Should not allow recipient address to add a token that already exists", async() =>
        {
            const nonce = 2;
            const amount = 0;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            try
            {
                await STKChannel.methods.addChannel(ERCToken.options.address, allAccounts[0], allAccounts[2], timeout).send();
                assert.fail("Should not be able to add duplicate token address");
            }
            catch (error)
            {
                assertRevert(error);
                assert.ok(true);
            }
        });
        
        
        it("Library should not allow non-channel participants to add token", async() =>
        {
            const nonce = 2;
            const amount = 0;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            try
            {
                await STKChannel.methods.close(allAccounts[6],nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:allAccounts[1]});
                assert.fail("Non-participants should not be able to add custom tokens");
            }
            catch (error)
            {
                assertRevert(error);
                assert.ok(true);
            }
        });
        
        it("Library should not allow channel recipients to add token", async() =>
        {
            const nonce = 2;
            const amount = 0;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            try
            {
                await STKChannel.methods.close(allAccounts[1],nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:allAccounts[1]});
                assert.fail("Customers should not be able to add custom tokens");
            }
            catch (error)
            {
                assertRevert(error);
                assert.ok(true);
            }
        });
        
        it("Library should allow recipient address to add tokens", async() =>
        {
            await STKChannel.methods.addChannel(WETHToken.options.address,allAccounts[0],allAccounts[2],timeout).send({from:allAccounts[1]});
            
            const STKData  = await STKChannel.methods.getChannelData(ERC20Token.options.address).call();
            const ETHData  = await STKChannel.methods.getChannelData(ERC20Token.options.address).call();
            
            assert.strictEqual(STKData[indexes.RECIPIENT_ADDRESS],allAccounts[1], "Recipient address in STK channels hould be identical");
            assert.strictEqual(ETHData[indexes.RECIPIENT_ADDRESS],allAccounts[1], "Recipient address in WETH channel should be identical")
            assert.strictEqual(STKData[indexes.USER_ADDRESS],allAccounts[0],"User address should be the same in STK channel");
            assert.strictEqual(ETHData[indexes.USER_ADDRESS],allAccounts[0], "User address should be the same in WETH channel");
        });
        
        it("Channel recipient should not be able to use the same nonce for contesting channel", async() =>
        {
            const nonce = 2;
            const amount = 10;
            
            
            
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            try
            {
                await STKChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:allAccounts[1]});
                assert.fail("Should not be able to use the same nonce for contesting channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });
        
        it("Channel recipient should not be able to use contest the closing of a channel with an amount greater than deposited amount", async() =>
        {
            const nonce = 2;
            const amount = 10000;
            
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            try
            {
                await STKChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:allAccounts[1]});
                assert.fail("Amount trying to update closed channel is greater than deposited amount");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });
        
        it("Channel participant should not be able to update an open channel", async() =>
        {
            const nonce = 2;
            const amount = 25;
            
            const cryptoParams = closingHelper.getClosingParameters(WETHToken.options.address,nonce,amount,STKChannel.address,signersPk);
            
            try
            {
                await STKChannel.methods.updateClosedChannel(WETHToken.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:allAccounts[1]});
                assert.fail("Participant should not be allowed to update an open channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });
        
        it("Channel participant should not be able to close a closed channel", async() =>
        {
            const nonce = 2;
            const amount = 25;
            
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:allAccounts[1]});
                assert.fail("Channel participant should not be able to close an already closed channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });
        
        it("Channel recipient should be able to contest the closing of a channel with a higher nonce", async() =>
        {
            const nonce = 4;
            const amount = 25;
            
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            
            await STKChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:allAccounts[1]});
            const data  = await STKChannel.methods.getChannelData(ERC20Token.options.address).call();
            
            assert.equal(data[indexes.AMOUNT_OWED],amount,"New closing amount should have updated");
            assert.equal(data[indexes.CLOSED_NONCE],nonce,"New closing nonce should be updated")
        });
        
        it("Channel participant should not be able to settle an open channel", async() =>
        {
            const nonce = 1;
            const amount = 0;
            var data;
            
            try
            {
                await STKChannel.methods.settle(WETHToken.options.address,true).send({from:allAccounts[1]});
                assert.fail("Channel participant should not be able to settle an open channel");
            }
            catch (error)
            {
                data  = await STKChannel.methods.getChannelData(WETHToken.options.address).call();
                assert.strictEqual(parseInt(data[indexes.CLOSED_NONCE].valueOf()),0,"Closed nonce should not have been reset");
                assert.strictEqual(parseInt(data[indexes.CLOSED_BLOCK].valueOf()),0,"Closed Block should not have been reset");
                assert.strictEqual(parseInt(data[indexes.AMOUNT_OWED].valueOf()),0,"Amount owed should not have been reset");
                assertRevert(error);
            }
        });
        
        it("Should transfer funds to user once settled", async() =>
        {
            const dataBefore  = await STKChannel.methods.getChannelData(ERC20Token.options.address).call();
            
            const depositedTokens = await ERC20Token.methods.balanceOf(STKChannel.options.address).call();
            const oldStackBalance = await ERC20Token.methods.balanceOf(allAccounts[1]).call();
            const oldUserBalance = await ERC20Token.methods.balanceOf(allAccounts[0]).call();
            const amountOwed = dataBefore[indexes.AMOUNT_OWED];
            
            await STKChannel.methods.settle(ERC20Token.options.address,true).send({from:allAccounts[1]});
            const dataAfter  = await STKChannel.methods.getChannelData(ERC20Token.options.address).call();
            
            const newUserBalance = await ERC20Token.methods.balanceOf(allAccounts[0]).call();
            const newStackBalance = await ERC20Token.methods.balanceOf(allAccounts[1]).call();
            
            assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf())>0,"Amount owed before settling should be greater than 0");
            assert.strictEqual(parseInt(dataAfter[indexes.AMOUNT_OWED].valueOf()),0,"Amount owed after settling should be 0");
            assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE].valueOf()),parseInt(dataAfter[indexes.CLOSED_NONCE].valueOf()),"closed nonce should not have been reset on settle");
            assert.equal(parseInt(newStackBalance.valueOf()), parseInt(oldStackBalance.valueOf()) + parseInt(amountOwed.valueOf()), 'The stack account value should be credited');
            assert.equal(parseInt(newUserBalance.valueOf()),parseInt(oldUserBalance.valueOf()) + parseInt(depositedTokens.valueOf()) - parseInt(amountOwed.valueOf()),'The User address should get back the unused tokens');
        });
        
        it("Should have token remain in the channel after settling", async() =>
        {
            await ERC20Token.methods.approve(allAccounts[0],100).send({from: allAccounts[3]});
            await ERC20Token.methods.transfer(allAccounts[0],100).send({from: allAccounts[3]});
            
            await ERC20Token.methods.approve(STKChannel.options.address,100).send({from: allAccounts[0]});
            await ERC20Token.methods.transfer(STKChannel.options.address,100).send({from: allAccounts[0]});
                        
            const nonce = 10;
            const amount = 5;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            await STKChannel.methods.close(ERC20Token.options.address,nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s).send({from:allAccounts[1]});
            
            for (i = 0; i<=timeout; i++)
            {
                var transaction = {from:allAccounts[7],to:allAccounts[8],gasPrice:1000000000,value:2};
                web3.eth.sendTransaction(transaction);
            }

            const oldUserBalance = await ERC20Token.methods.balanceOf(allAccounts[0]).call();            
            const depositedTokens = await ERC20Token.methods.balanceOf(STKChannel.options.address).call();
            const dataBefore  = await STKChannel.methods.getChannelData(ERC20Token.options.address).call();
            const oldStackBalance = await ERC20Token.methods.balanceOf(allAccounts[1]).call();
            const amountOwed = dataBefore[indexes.AMOUNT_OWED];
            const oldChannelBalance = await ERC20Token.methods.balanceOf(STKChannel.options.address).call();

            await STKChannel.methods.settle(ERC20Token.options.address,false).send({from:allAccounts[1]});
            const dataAfter  = await STKChannel.methods.getChannelData(ERC20Token.options.address).call();
            
            const newUserBalance = await ERC20Token.methods.balanceOf(allAccounts[0]).call();
            const newStackBalance = await ERC20Token.methods.balanceOf(allAccounts[1]).call();
            const newChannelBalance = await ERC20Token.methods.balanceOf(STKChannel.options.address).call();

            
            assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf())>0,"Amount owed before settling should be greater than 0");
            assert.strictEqual(parseInt(dataAfter[indexes.AMOUNT_OWED].valueOf()),0,"Amount owed after settling should be 0");
            assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE].valueOf()),parseInt(dataAfter[indexes.CLOSED_NONCE].valueOf()),"closed nonce should not have been reset on settle");
            assert.equal(parseInt(newStackBalance.valueOf()),parseInt(oldStackBalance.valueOf()) + parseInt(amountOwed.valueOf()), 'The stack account value should be credited');
            assert.equal(parseInt(newChannelBalance.valueOf()),parseInt(oldChannelBalance.valueOf()) - parseInt(amountOwed.valueOf()), 'Unspent token should remain in the channel account');
            assert.equal(parseInt(newUserBalance.valueOf()),parseInt(oldUserBalance.valueOf()), 'The User address account value should remain the same');
        });
        
    });