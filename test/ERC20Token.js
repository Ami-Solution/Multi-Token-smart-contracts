
const MultiChannel = require('Embark/contracts/MultiChannel');
const ERC20Token = require('Embark/contracts/ERC20Token');
const MultiLibrary = require('Embark/contracts/MultiLibrary');
const indexes = require('./helpers/ChannelDataIndexes.js')
const StandardToken = require('Embark/contracts/StandardToken.sol');
const Token = require('Embark/contracts/Token.sol');
const closingHelper = require('./helpers/channelClosingHelper');
const assertRevert = require('./helpers/assertRevert');
const testConstant = require('./helpers/testConstant');
const allAccounts = testConstant.ACCOUNTS; 
const initialCreation = testConstant.INIT;
const timeout = testConstant.TIMEOUT;

config({
    "deployment": {
        "accounts": [
            {
                "mnemonic":testConstant.MNEMONIC,
                "numAddresses":testConstant.NUM_ADDRESS,
                "addressIndex": testConstant.INDEX,
                "hdpath":testConstant.PATH
            }
        ]},
        contracts: {
            "Token": {

            },
            "StandardToken": {

            },
            "WETHToken": {
                args:[initialCreation, "WETH", 18, "STK"],
                "instanceOf": "ERC20Token",
                "from": allAccounts[3]
            },
            "ThingToken": {
                args:[initialCreation, "Thing", 18, "THG"],
                "instanceOf": "ERC20Token",
                "from": allAccounts[3]
            },
            "ERC20Token": {
                args: [initialCreation,'STK', 18, 'STK'],
                "from": allAccounts[3]
            },
            MultiLibrary: {
                args: [
                    '$ERC20Token',
                    '0xC6eA7fD8628672780dd4F17Ffda321AA6753134B',
                    allAccounts[2],
                    allAccounts[1],
                    timeout,
                    1,
                    0,
                    0
                ],
                "fromIndex":1
            },
            "MultiChannel": {
                args: [
                    allAccounts[0],
                    allAccounts[2],
                    '$ERC20Token',
                    timeout
                ],
                "from": allAccounts[1]
            }
        }
    });

    contract("Testing ERC20 Tokens", function () {
        this.timeout(0);
        let userAddress = allAccounts[0]; 
        let recipientAddress= allAccounts[1]; 
        let signerAddress = allAccounts[2]; 
        const signersPk = Buffer.from(testConstant.SIGNER_PK, 'hex');
        const userPk = Buffer.from(testConstant.USER_PK,'hex');
        const recipientPk = Buffer.from(testConstant.RECIPIENT_PK, 'hex');
        const recipientAddressPk = Buffer.from(testConstant.RECIPIENT_PK,'hex');
        var nonce = 1;
        
        it("STK Token is deployed ", function()
        {
            let ERC20TokenAddress = ERC20Token.options.address;
            assert.ok(ERC20TokenAddress.length > 0);
        });

        it("STK Token should have 1 billion tokens in initialized account after declaration", async()=> {
            const balance = await ERC20Token.methods.balanceOf(allAccounts[3]).call(); 
            assert.equal(balance.valueOf(), 1000000000, '1 billion was not in the first account');
        });
        
        it('STK Token should have symbol as Multi',async()=> {
            const symbol = await ERC20Token.symbol.call();
            assert.equal(symbol,'STK','Symbol is not STK');
        });  
        
        it('STK Token should have 18 decimal points', async() => { 
            const decimal = await ERC20Token.decimals.call(); 
            assert.equal(decimal, 18, "Decimal points is not 18"); 
        })
    
});