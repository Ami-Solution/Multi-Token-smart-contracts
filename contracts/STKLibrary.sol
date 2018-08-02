pragma solidity ^0.4.23;

import "./ERC20Token.sol";
import "./SafeMathLib.sol";

library STKLibrary
{
    using SafeMathLib for uint;

    struct STKChannelData
    {
        ERC20Token token_;
        address userAddress_;
        address signerAddress_;
        address recipientAddress_;
        uint timeout_;
        uint amountOwed_;
        uint closedBlock_;
        uint closedNonce_;
        bool shouldReturn_; 
    }

    event LogChannelSettled(uint blockNumber, uint finalBalance);
    event CloseTest(address addr);

    modifier channelAlreadyClosed(STKChannelData storage data)
    {
        require(data.closedBlock_ > 0);
        _;
    }

    modifier timeoutOver(STKChannelData storage data)
    {
        require(data.closedBlock_ + data.timeout_ < block.number);
        _;
    }

    modifier channelIsOpen(STKChannelData storage data)
    {
        require(data.closedBlock_ == 0);
        _;
    }

    modifier callerIsChannelParticipant(STKChannelData storage data)
    {
        require(msg.sender == data.recipientAddress_||msg.sender == data.userAddress_);
        _;
    }

    modifier isSufficientBalance(STKChannelData storage data, uint amount, address channelAddress)
    {
        require(amount <= data.token_.balanceOf(channelAddress));
        _;
    }

    /**
    * @notice Function to close the payment channel.
    * @param data The channel specific data to work on.
    * @param _nonce The nonce of the deposit. Used for avoiding replay attacks.
    * @param _amount The amount of tokens claimed to be due to the receiver.
    * @param _v Cryptographic param v derived from the signature.
    * @param _r Cryptographic param r derived from the signature.
    * @param _s Cryptographic param s derived from the signature.
    */
    function close(
        STKChannelData storage data,
        address _channelAddress,
        address _addressOfToken,
        uint _nonce,
        uint _amount,
        uint8 _v,
        bytes32 _r,
        bytes32 _s,
        bool _returnToken
        )
        public
        channelIsOpen(data)
        callerIsChannelParticipant(data)
        isSufficientBalance(data, _amount, _channelAddress)
    {
        address signerAddress = recoverAddressFromHashAndParameters(_addressOfToken, _nonce,_amount,_r,_s,_v);
        require((signerAddress == data.signerAddress_ && data.recipientAddress_  == msg.sender) || (signerAddress == data.recipientAddress_  && data.signerAddress_==msg.sender));
        require(signerAddress!=msg.sender);
        require(data.closedNonce_ < _nonce);
        data.amountOwed_ = _amount;
        data.closedNonce_ = _nonce;
        data.closedBlock_ = block.number;
        data.shouldReturn_ = _returnToken; 
    }

    /**
    * @notice Function to close the payment channel without a signature.
    * @param data The channel specific data to work on.
    */
    function closeWithoutSignature(STKChannelData storage data)
        public
        channelIsOpen(data)
        callerIsChannelParticipant(data)
    {
        data.closedBlock_ = block.number;
    }

    /**
    * @notice Function to contest the closing state of the payment channel. Will be able to be called for a time period (in blocks) given by timeout after closing of the channel.
    * @param data The channel specific data to work on.
    * @param _nonce The nonce of the deposit. Used for avoiding replay attacks.
    * @param _amount The amount of tokens claimed to be due to the receiver.
    * @param _v Cryptographic param v derived from the signature.
    * @param _r Cryptographic param r derived from the signature.
    * @param _s Cryptographic param s derived from the signature.
    */
    function updateClosedChannel(
        STKChannelData storage data,
        address _channelAddress,
        address _addressOfToken,
        uint _nonce,
        uint _amount,
        uint8 _v,
        bytes32 _r,
        bytes32 _s)
        public
        callerIsChannelParticipant(data)
        channelAlreadyClosed(data)
        isSufficientBalance(data, _amount, _channelAddress)
    {
        address signerAddress = recoverAddressFromHashAndParameters(_addressOfToken, _nonce,_amount,_r,_s,_v);
        require(signerAddress == data.signerAddress_);
        require(data.closedNonce_ < _nonce);
        data.closedNonce_ = _nonce;
        //update the amount
        data.amountOwed_ = _amount;
    }

    /**
    * @notice After the timeout of the channel after closing has passed, can be called by either participant to withdraw funds.
    * @param data The channel specific data to work on.
    */
    function settle(STKChannelData storage data, address _channelAddress)
        public
        channelAlreadyClosed(data)
        timeoutOver(data)
        callerIsChannelParticipant(data)
        isSufficientBalance(data, data.amountOwed_, _channelAddress)

    {
        uint returnToUserAmount = data.token_.balanceOf(_channelAddress).minus(data.amountOwed_);
        uint owedAmount = data.amountOwed_;
        data.amountOwed_ = 0;

        data.closedBlock_ = 0;

        if(owedAmount > 0)
        {
            require(data.token_.transfer(data.recipientAddress_,owedAmount));
        }

        if(returnToUserAmount > 0 && data.shouldReturn_)
        {
            require(data.token_.transfer(data.userAddress_,returnToUserAmount));
        }

        emit LogChannelSettled(block.number,owedAmount);
    }

    /**
    * @notice Add new token
    * @param data The channel specific data to work on.
    */
    function addChannel(STKChannelData storage data, address _from, address _addressOfSigner, uint _expiryNumberOfBlocks)
        public
    {
        data.userAddress_ = _from;
        data.signerAddress_ = _addressOfSigner;
        data.recipientAddress_ = msg.sender;
        data.timeout_ = _expiryNumberOfBlocks;
    }

    /**
    * @notice After the timeout of the channel after closing has passed, can be called by either participant to withdraw funds.
    * @param _nonce The nonce of the deposit. Used for avoiding replay attacks.
    * @param _amount The amount of tokens claimed to be due to the receiver.
    * @param r Cryptographic param v derived from the signature.
    * @param s Cryptographic param r derived from the signature.
    * @param v Cryptographic param s derived from the signature.
    */
    function recoverAddressFromHashAndParameters(address _addressOfToken, uint _nonce,uint _amount,bytes32 r,bytes32 s,uint8 v)
        internal view
        returns (address)
    {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 msgHash = keccak256(this, _addressOfToken, _nonce,_amount);
        bytes32 prefixedHash = keccak256(prefix, msgHash);
        return ecrecover(prefixedHash, v, r, s);
    }
}
