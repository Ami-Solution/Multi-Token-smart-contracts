let ethers = require('ethers'); 
let MultiChannel = require('Embark/contracts/MultiChannel');
let ERC20Token = require('Embark/contracts/ERC20Token');
let MultiLibrary = require('Embark/contracts/MultiLibrary');
let closingHelper = require('./helpers/channelClosingHelper');
let assertRevert = require('./helpers/assertRevert');
let testConstant = require('./helpers/testConstant');
let allAccounts = testConstant.ACCOUNTS;
let indexes = require('./helpers/ChannelDataIndexes.js')
let initialCreation = testConstant.INIT;
let timeout = testConstant.TIMEOUT;
let userAddress = allAccounts[0];
let recipientAddress = allAccounts[1];
let signerAddress = allAccounts[2];
let nonParticipantAddress = allAccounts[3];
var ethUtil = require('ethereumjs-util');
var crypto = require('crypto');

contract("Token Instantiation Tests", function () {
    beforeEach((done) => {
        config({
            "deployment": {
                "accounts": [{
                    "mnemonic": testConstant.MNEMONIC,
                    "numAddresses": testConstant.NUM_ADDRESS,
                    "addressIndex": testConstant.INDEX,
                    "hdpath": testConstant.PATH
                }]
            },
            contracts: {
                "WETHToken": {
                    args: [initialCreation, "WETH", 18, "STK"],
                    "instanceOf": "ERC20Token",
                    "from": nonParticipantAddress
                },
                "ThingToken": {
                    args: [initialCreation, "Thing", 18, "THG"],
                    "instanceOf": "ERC20Token",
                    "from": nonParticipantAddress
                },
                "ERC20Token": {
                    args: [initialCreation, 'STK', 18, 'STK'],
                    "from": nonParticipantAddress
                },
                MultiLibrary: {
                    args: [],
                    "from": recipientAddress
                },
                "MultiChannel": {
                    args: [
                        userAddress,
                        signerAddress,
                        '$ERC20Token',
                        timeout
                    ],
                    "from": recipientAddress
                }
            }
        }, done);
    });

    function generateEcKeys() {
        let wallet = ethers.Wallet.createRandom(); 
        return wallet.address;
    }

    it("MultiChannel should have been deployed", async () => {
        let address = MultiChannel.options.address;
        assert.ok(address.length > 0);
    });

    it("Testing 10 subchannels", async () => {
        let channelAddress = [];
        for (let i = 0; i < 10; i++) {
            let publicAddress = generateEcKeys();
            channelAddress.push(publicAddress);
        }

        for (let i = 0; i < channelAddress.length; i++) {
            let currentAddress = channelAddress[i];
            await MultiChannel.methods.addChannel(currentAddress, userAddress, recipientAddress, 10).send({
                from: recipientAddress
            });
        }

        for (let i = 0; i < channelAddress.length; i++) {
            let currentAddress = channelAddress[i];
            const data = await MultiChannel.methods.getChannelData(currentAddress).call();
            assert.ok(data[indexes.USER_ADDRESS].toString(), userAddress, "User for respective address should be equal");
            assert.ok(data[indexes.SIGNER_ADDRESS].toString(), signerAddress, "Signer for respective address should be equal")
            assert.ok(data[indexes.TIMEOUT].toString(), timeout, "Timeout should be equal to the one set");
            assert.ok(data[indexes.CLOSED_BLOCK].toString(), 0, "Closed block should be 0");
        }

        let otherAddress = generateEcKeys();
        const undefinedTokenState = await MultiChannel.methods.getChannelData(otherAddress).call();
        assert.ok(undefinedTokenState[indexes.USER_ADDRESS].toString, 0x0000000000000000000000000000000000000000, "User address for token should be undefined");
        assert.ok(undefinedTokenState[indexes.SIGNER_ADDRESS].toString(), 0x0000000000000000000000000000000000000000, "Signer address for token value should be undefined");
        assert.ok(undefinedTokenState[indexes.CLOSED_BLOCK].toString(), 0, "Closed block for token value should be 0");
        assert.ok(undefinedTokenState[indexes.TIMEOUT].toString(), 0, "Timeout should be undefined");

    });

    it("Testing 30 subchannels", async () => {
        let channelAddress = [];
        for (let i = 0; i < 30; i++) {
            let publicAddress = generateEcKeys();
            channelAddress.push(publicAddress);
        }

        for (let i = 0; i < channelAddress.length; i++) {
            let currentAddress = channelAddress[i];
            await MultiChannel.methods.addChannel(currentAddress, userAddress, recipientAddress, 10).send({
                from: recipientAddress
            });
        }

        for (let i = 0; i < channelAddress.length; i++) {
            let currentAddress = channelAddress[i];
            const data = await MultiChannel.methods.getChannelData(currentAddress).call();
            assert.ok(data[indexes.USER_ADDRESS].toString(), userAddress, "User for respective address should be equal");
            assert.ok(data[indexes.SIGNER_ADDRESS].toString(), signerAddress, "Signer for respective address should be equal")
            assert.ok(data[indexes.TIMEOUT].toString(), timeout, "Timeout should be equal to the one set");
            assert.ok(data[indexes.CLOSED_BLOCK].toString(), 0, "Closed block should be 0");
        }

        let otherAddress = generateEcKeys();
        const undefinedTokenState = await MultiChannel.methods.getChannelData(otherAddress).call();
        assert.ok(undefinedTokenState[indexes.USER_ADDRESS].toString, 0x0000000000000000000000000000000000000000, "User address for token should be undefined");
        assert.ok(undefinedTokenState[indexes.SIGNER_ADDRESS].toString(), 0x0000000000000000000000000000000000000000, "Signer address for token value should be undefined");
        assert.ok(undefinedTokenState[indexes.CLOSED_BLOCK].toString(), 0, "Closed block for token value should be 0");
        assert.ok(undefinedTokenState[indexes.TIMEOUT].toString(), 0, "Timeout should be undefined");

    });

    it("Testing 50 subchannels", async () => {
        let channelAddress = [];
        for (let i = 0; i < 50; i++) {
            let publicAddress = generateEcKeys();
            channelAddress.push(publicAddress);
        }

        for (let i = 0; i < channelAddress.length; i++) {
            let currentAddress = channelAddress[i];
            await MultiChannel.methods.addChannel(currentAddress, userAddress, recipientAddress, 10).send({
                from: recipientAddress
            });
        }

        for (let i = 0; i < channelAddress.length; i++) {
            let currentAddress = channelAddress[i];
            const data = await MultiChannel.methods.getChannelData(currentAddress).call();
            assert.ok(data[indexes.USER_ADDRESS].toString(), userAddress, "User for respective address should be equal");
            assert.ok(data[indexes.SIGNER_ADDRESS].toString(), signerAddress, "Signer for respective address should be equal")
            assert.ok(data[indexes.TIMEOUT].toString(), timeout, "Timeout should be equal to the one set");
            assert.ok(data[indexes.CLOSED_BLOCK].toString(), 0, "Closed block should be 0");
        }

        let otherAddress = generateEcKeys();
        const undefinedTokenState = await MultiChannel.methods.getChannelData(otherAddress).call();
        assert.ok(undefinedTokenState[indexes.USER_ADDRESS].toString, 0x0000000000000000000000000000000000000000, "User address for token should be undefined");
        assert.ok(undefinedTokenState[indexes.SIGNER_ADDRESS].toString(), 0x0000000000000000000000000000000000000000, "Signer address for token value should be undefined");
        assert.ok(undefinedTokenState[indexes.CLOSED_BLOCK].toString(), 0, "Closed block for token value should be 0");
        assert.ok(undefinedTokenState[indexes.TIMEOUT].toString(), 0, "Timeout should be undefined");
    });

    it("Testing 75 subchannels", async () => {
        let channelAddress = [];
        for (let i = 0; i < 75; i++) {
            let publicAddress = generateEcKeys();
            channelAddress.push(publicAddress);
        }

        for (let i = 0; i < channelAddress.length; i++) {
            let currentAddress = channelAddress[i];
            await MultiChannel.methods.addChannel(currentAddress, userAddress, recipientAddress, 10).send({
                from: recipientAddress
            });
        }

        for (let i = 0; i < channelAddress.length; i++) {
            let currentAddress = channelAddress[i];
            const data = await MultiChannel.methods.getChannelData(currentAddress).call();
            assert.ok(data[indexes.USER_ADDRESS].toString(), userAddress, "User for respective address should be equal");
            assert.ok(data[indexes.SIGNER_ADDRESS].toString(), signerAddress, "Signer for respective address should be equal")
            assert.ok(data[indexes.TIMEOUT].toString(), timeout, "Timeout should be equal to the one set");
            assert.ok(data[indexes.CLOSED_BLOCK].toString(), 0, "Closed block should be 0");
        }

        let otherAddress = generateEcKeys(); 
        const undefinedTokenState = await MultiChannel.methods.getChannelData(otherAddress).call();     
        assert.ok(undefinedTokenState[indexes.USER_ADDRESS].toString,0x0000000000000000000000000000000000000000, "User address for token should be undefined"); 
        assert.ok(undefinedTokenState[indexes.SIGNER_ADDRESS].toString(),0x0000000000000000000000000000000000000000, "Signer address for token value should be undefined"); 
        assert.ok(undefinedTokenState[indexes.CLOSED_BLOCK].toString(),0,"Closed block for token value should be 0"); 
        assert.ok(undefinedTokenState[indexes.TIMEOUT].toString(),0,"Timeout should be undefined"); 
    });

    it("Testing 100 subchannels", async () => {
        let channelAddress = [];
        for (let i = 0; i < 100; i++) {
            let publicAddress = generateEcKeys();
            channelAddress.push(publicAddress);
        }

        for (let i = 0; i < channelAddress.length; i++) {
            let currentAddress = channelAddress[i];
            await MultiChannel.methods.addChannel(currentAddress, userAddress, recipientAddress, 10).send({
                from: recipientAddress
            });
        }

        for (let i = 0; i < channelAddress.length; i++) {
            let currentAddress = channelAddress[i];
            const data = await MultiChannel.methods.getChannelData(currentAddress).call();
            assert.ok(data[indexes.USER_ADDRESS].toString(), userAddress, "User for respective address should be equal");
            assert.ok(data[indexes.SIGNER_ADDRESS].toString(), signerAddress, "Signer for respective address should be equal")
            assert.ok(data[indexes.TIMEOUT].toString(), timeout, "Timeout should be equal to the one set");
            assert.ok(data[indexes.CLOSED_BLOCK].toString(), 0, "Closed block should be 0");
        }

        let otherAddress = generateEcKeys(); 
        const undefinedTokenState = await MultiChannel.methods.getChannelData(otherAddress).call();     
        assert.ok(undefinedTokenState[indexes.USER_ADDRESS].toString,0x0000000000000000000000000000000000000000, "User address for token should be undefined"); 
        assert.ok(undefinedTokenState[indexes.SIGNER_ADDRESS].toString(),0x0000000000000000000000000000000000000000, "Signer address for token value should be undefined"); 
        assert.ok(undefinedTokenState[indexes.CLOSED_BLOCK].toString(),0,"Closed block for token value should be 0"); 
        assert.ok(undefinedTokenState[indexes.TIMEOUT].toString(),0,"Timeout should be undefined"); 
    });

    /**
    it("Testing 500 subchannels", async () => {
        let channelAddress = [];
        for (let i = 0; i < 500; i++) {
            let publicAddress = generateEcKeys();
            channelAddress.push(publicAddress);
        }

        for (let i = 0; i < channelAddress.length; i++) {
            let currentAddress = channelAddress[i];
            await MultiChannel.methods.addChannel(currentAddress, userAddress, recipientAddress, 10).send({
                from: recipientAddress
            });
        }

        for (let i = 0; i < channelAddress.length; i++) {
            let currentAddress = channelAddress[i];
            const data = await MultiChannel.methods.getChannelData(currentAddress).call();
            assert.ok(data[indexes.USER_ADDRESS].toString(), userAddress, "User for respective address should be equal");
            assert.ok(data[indexes.SIGNER_ADDRESS].toString(), signerAddress, "Signer for respective address should be equal")
            assert.ok(data[indexes.TIMEOUT].toString(), timeout, "Timeout should be equal to the one set");
            assert.ok(data[indexes.CLOSED_BLOCK].toString(), 0, "Closed block should be 0");
        }

        let otherAddress = generateEcKeys(); 
        const undefinedTokenState = await MultiChannel.methods.getChannelData(otherAddress).call();     
        assert.ok(undefinedTokenState[indexes.USER_ADDRESS].toString,0x0000000000000000000000000000000000000000, "User address for token should be undefined"); 
        assert.ok(undefinedTokenState[indexes.SIGNER_ADDRESS].toString(),0x0000000000000000000000000000000000000000, "Signer address for token value should be undefined"); 
        assert.ok(undefinedTokenState[indexes.CLOSED_BLOCK].toString(),0,"Closed block for token value should be 0"); 
        assert.ok(undefinedTokenState[indexes.TIMEOUT].toString(),0,"Timeout should be undefined"); 
    });

    it("Testing 1000 subchannels", async () => {
        let channelAddress = [];
        for (let i = 0; i < 1000; i++) {
            let publicAddress = generateEcKeys();
            channelAddress.push(publicAddress);
        }

        for (let i = 0; i < channelAddress.length; i++) {
            let currentAddress = channelAddress[i];
            await MultiChannel.methods.addChannel(currentAddress, userAddress, recipientAddress, 10).send({
                from: recipientAddress
            });
        }

        for (let i = 0; i < channelAddress.length; i++) {
            let currentAddress = channelAddress[i];
            const data = await MultiChannel.methods.getChannelData(currentAddress).call();
            assert.ok(data[indexes.USER_ADDRESS].toString(), userAddress, "User for respective address should be equal");
            assert.ok(data[indexes.SIGNER_ADDRESS].toString(), signerAddress, "Signer for respective address should be equal")
            assert.ok(data[indexes.TIMEOUT].toString(), timeout, "Timeout should be equal to the one set");
            assert.ok(data[indexes.CLOSED_BLOCK].toString(), 0, "Closed block should be 0");
        }

        let otherAddress = generateEcKeys(); 
        const undefinedTokenState = await MultiChannel.methods.getChannelData(otherAddress).call();     
        assert.ok(undefinedTokenState[indexes.USER_ADDRESS].toString,0x0000000000000000000000000000000000000000, "User address for token should be undefined"); 
        assert.ok(undefinedTokenState[indexes.SIGNER_ADDRESS].toString(),0x0000000000000000000000000000000000000000, "Signer address for token value should be undefined"); 
        assert.ok(undefinedTokenState[indexes.CLOSED_BLOCK].toString(),0,"Closed block for token value should be 0"); 
        assert.ok(undefinedTokenState[indexes.TIMEOUT].toString(),0,"Timeout should be undefined"); 
    });
     */
});