const ERC20Token = require('Embark/contracts/ERC20Token');
const testConstant = require('./helpers/testConstant');
const allAccounts = testConstant.ACCOUNTS;
const initialCreation = testConstant.INIT;
const timeout = testConstant.TIMEOUT;
const userAddress = allAccounts[0];
const recipientAddress = allAccounts[1];
const signerAddress = allAccounts[2];
const nonParticipantAddress = allAccounts[3];
const BigNumber = require('bignumber.js');
const signersPk = Buffer.from(testConstant.SIGNER_PK, 'hex');
const userPk = Buffer.from(testConstant.USER_PK, 'hex');
const recipientPk = Buffer.from(testConstant.RECIPIENT_PK, 'hex');
let nonce = 1;

contract("ERC20 Token Tests", function () {
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
                    args: [
                        '$ERC20Token',
                        signerAddress,
                        recipientAddress,
                        timeout,
                        1,
                        0,
                        0
                    ],
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



    it("STK Token is deployed ", function () {
        let ERC20TokenAddress = ERC20Token.options.address;
        assert.ok(ERC20TokenAddress.length > 0);
    });

    it("STK Token should have 1 billion tokens in initialized account after declaration", async () => {
        const balance = new BigNumber(await ERC20Token.methods.balanceOf(nonParticipantAddress).call());
        assert.equal(balance.valueOf(), initialCreation, '1 billion was not in the first account');
    });

    it('STK Token should have symbol as STK', async () => {
        const symbol = await ERC20Token.symbol.call();
        assert.equal(symbol, 'STK', 'Symbol is not STK');
    });

    it('STK Token should have 18 decimal points', async () => {
        const decimal = await ERC20Token.decimals.call();
        assert.equal(decimal, 18, "Decimal points is not 18");
    })

});