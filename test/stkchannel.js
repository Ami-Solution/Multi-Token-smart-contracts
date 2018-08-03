/*global contract, config, it, assert, web3*/
const STKChannel = require('Embark/contracts/STKChannel');
const ERC20Token = require('Embark/contracts/ERC20Token');
const STKLibrary = require('Embark/contracts/STKLibrary');
const indexes = require('./helpers/ChannelDataIndexes.js')
const StandardToken = require('Embark/contracts/StandardToken.sol');
const Token = require('Embark/contracts/Token.sol');
const port = 8545;

contract("Testing STKChannel", function () {
    this.timeout(0);
    let allAccounts;
    const timeout = 10;
    const initialCreation = 1000000000;

    config({
        deployment: {
            "host": "localhost",
            "port": port,
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
                    "port": port,
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

        it("STK Channel is deployed ", function()
        {
            let STKChannelAddress = STKChannel.options.address;
            assert.ok(STKChannelAddress.length > 0);
        });
        it("STK Channel should be initialized for ERC 20 Token",async() =>
        {
            const data  = await STKChannel.methods.getChannelData(ERC20Token.options.address).call();
            assert.equal(data[indexes.USER_ADDRESS],allAccounts[0],'user account should be identical, but is not');
            assert.equal(data[indexes.RECIPIENT_ADDRESS], allAccounts[1], 'recipient account should be identical, but is not')
            assert.equal(data[indexes.SIGNER_ADDRESS], allAccounts[2], 'recipient account should be identical, but is not')
            assert.equal(data[indexes.TIMEOUT],timeout, "timeouts are not identical");
            assert.equal(data[indexes.CLOSED_BLOCK], 0, "closed block should be 0");
            assert.equal(data[indexes.CLOSED_NONCE], 0, "closed nonce should be 0")
        })
        it("STK Channel should not be initialized for non-init ERC20 Token",async() =>
        {
            const data  = await STKChannel.methods.getChannelData(0x000000000000000000).call();
            assert.equal(data[indexes.USER_ADDRESS],0x000000000000000000,'accounts are not equal');
            assert.equal(data[indexes.TIMEOUT],0, "timeouts are not identical");
            assert.equal(data[indexes.CLOSED_BLOCK], 0, "closed block should be 0");
            assert.equal(data[indexes.CLOSED_NONCE], 0, "closed nonce should be 0")
        })
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
        it("STK channel should close without signature",async() =>
        {
            await STKChannel.methods.closeWithoutSignature(ERC20Token.options.address,true).send();
            const data  = await STKChannel.methods.getChannelData(ERC20Token.options.address,).call();

            const block = data[indexes.CLOSED_BLOCK];

            assert(block.valueOf()>0,'closed block is not greater than zero');

        })
    });