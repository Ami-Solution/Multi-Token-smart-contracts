const web3Utils = require('web3-utils')
var ethUtil = require('ethereumjs-util');

var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "";
const prefix = new Buffer("\x19Ethereum Signed Message:\n");


var cryptoParams;
const userAddress = "0xd46920A8E431F362AE8b512C1d4BAa767389862D";
const signerAddress = "0x9A2cdf03ca133a21E6357BfD1951c206CA090cD4";
const tokenAddress = "0xfdFC29f85e24D4BB0F3CD557b01492f9Ea976595"; 
var signerPk = "ea2624dcf732a5a08c99648d78f1b6b887bfe3198c90deaa9f8a6a14ca2c4b95";
var STKChannelAddr = "0x70458596bafb041c1f836a3a80249db65a41ffdf";
var pkBuffer = Buffer.from(signerPk, "hex");
var nonce = 1; //Keep incrementing this every time a channel is closed and/or contested
var amount = 1 //Ensure this amount is in the payment channel 

console.log("-----------Initialize STKChannel------------\n")
console.log("\"" + userAddress + "\",\"" + signerAddress + "\",\"" + tokenAddress + "\",\"" + "1" + "\"\n");

console.log("-----------Add Payment Channel------------\n")
console.log("\"" + tokenAddress + "\",\"" + userAddress + "\",\"" + signerAddress + "\",\"" + "1" + "\"\n");

signTransaction(STKChannelAddr, tokenAddress, nonce, amount, pkBuffer);


function signTransaction(STKChannelAddr, tokenAddress, nonce, amount, pk) {
    const hash = web3Utils.soliditySha3(STKChannelAddr,tokenAddress, nonce,amount);
    msgHash = ethUtil.toBuffer(hash)

    var prefixedMsg = addPrefix(msgHash);
    const sig = ethUtil.ecsign(prefixedMsg, pk);
    var serialized = ethUtil.bufferToHex(concatSig(sig.v, sig.r, sig.s));

    var signatureData = ethUtil.fromRpcSig(serialized);
    let v = ethUtil.bufferToHex(signatureData.v)
    let r = ethUtil.bufferToHex(signatureData.r)
    let s = ethUtil.bufferToHex(signatureData.s)
    cryptoParams = {r:r,s:s,v:v};

    console.log("-----------Close Payment Channel------------\n")
    console.log("\"" + tokenAddress + "\"," + nonce + "," + amount + ",\"" + v + "\",\""  + r + "\",\"" + s + "\",\"" + "true\"\n");
    console.log("\"" + tokenAddress + "\"," + nonce + "," + amount + ",\"" + v + "\",\""  + r + "\",\"" + s + "\"," + "false\n");    

    console.log("-----------Settle Payment Channel------------\n")
    console.log("\"" + tokenAddress + "\"");

    return cryptoParams;
};

function concatSig(v, r, s) {
    r = ethUtil.fromSigned(r)
    s = ethUtil.fromSigned(s)
    v = ethUtil.bufferToInt(v)
    r = ethUtil.toUnsigned(r).toString('hex')
    s = ethUtil.toUnsigned(s).toString('hex')
    v = ethUtil.stripHexPrefix(ethUtil.intToHex(v))
    return ethUtil.addHexPrefix(r.concat(s, v).toString("hex"))
}

function addPrefix(msgHash) {
    return ethUtil.sha3(
        Buffer.concat([prefix, Buffer.from(msgHash.length.toString()), msgHash])
    );
}
