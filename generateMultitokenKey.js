const web3Utils = require('web3-utils')
var ethUtil = require('ethereumjs-util');

var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "";
const prefix = new Buffer("\x19Ethereum Signed Message:\n");


var cryptoParams;
const userAddress = "addressYouWantTokenReturnedTo";
const signerAddress = "addressOfSigner";
const tokenAddress = "AnyErc20Token"; 
var signerPk = "privateKeyAssociatedWithAddressOfSigner";
var MultiChannelAddr = "channelAddress";
var pkBuffer = Buffer.from(signerPk, "hex");
var nonce = 1; 
var amount = 1 

console.log("-----------Initialize STKChannel------------\n")
console.log("\"" + userAddress + "\",\"" + signerAddress + "\",\"" + tokenAddress + "\",\"" + "1" + "\"\n");

console.log("-----------Add Payment Channel------------\n")
console.log("\"" + tokenAddress + "\",\"" + userAddress + "\",\"" + signerAddress + "\",\"" + "1" + "\"\n");

signTransaction(MultiChannelAddr, tokenAddress, nonce, amount, pkBuffer);


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
