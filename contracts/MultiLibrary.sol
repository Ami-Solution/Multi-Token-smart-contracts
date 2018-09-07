pragma solidity ^ 0.4 .23;

import "./ERC20Token.sol";
import "./SafeMathLib.sol";

library MultiLibrary {
    using SafeMathLib
    for uint;

    struct MultiChannelData {
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

    modifier channelAlreadyClosed(MultiChannelData storage data) {
        require(data.closedBlock_ > 0);
        _;
    }
    modifier inContestPeriod(MultiChannelData storage data) {
        require(data.closedBlock_ + data.timeout_ >= block.number);
        _;
    }

    modifier timeoutOver(MultiChannelData storage data) {
        require(data.closedBlock_ + data.timeout_ < block.number);
        _;
    }

    modifier channelIsOpen(MultiChannelData storage data) {
        require(data.closedBlock_ == 0);
        _;
    }

    modifier callerIsChannelParticipant(MultiChannelData storage data) {
        require(msg.sender == data.recipientAddress_ || msg.sender == data.userAddress_);
        _;
    }

    modifier isSufficientBalance(MultiChannelData storage data, uint amount, address channelAddress) {
        require(amount <= data.token_.balanceOf(channelAddress));
        _;
    }

    /**
     * @notice Function to close the payment channel.
     * @param data The channel specific data to work on.
     * @param _channelAddress The address of the respective multitoken channel.
     * @param _addressOfToken The address of the token.
     * @param _nonce The nonce of the deposit. Used for avoiding replay attacks.
     * @param _amount The amount of tokens claimed to be due to the receiver.
     * @param _v Cryptographic param v derived from the signature.
     * @param _r Cryptographic param r derived from the signature.
     * @param _s Cryptographic param s derived from the signature.
     * @param _returnToken Determines to/to not return funds to user after settle.
     */
    function close(
        MultiChannelData storage data,
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
    isSufficientBalance(data, _amount, _channelAddress) {
        address signerAddress = recoverAddressFromHashAndParameters(_addressOfToken, _nonce, _amount, _r, _s, _v);
        require((signerAddress == data.signerAddress_ && data.recipientAddress_ == msg.sender) || (signerAddress == data.recipientAddress_ && data.userAddress_ == msg.sender));
        require(signerAddress != msg.sender);
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
    function closeWithoutSignature(MultiChannelData storage data)
    public
    channelIsOpen(data)
    callerIsChannelParticipant(data) {
        data.shouldReturn_ = true;
        data.closedBlock_ = block.number;
    }

    /**
     * @notice Function to contest the closing state of the payment channel. Will be able to be called for a time period (in blocks) given by timeout after closing of the channel.
     * @param data The channel specific data to work on.
     * @param _addressOfToken The address of the token.
     * @param _nonce The nonce of the deposit. Used for avoiding replay attacks.
     * @param _amount The amount of tokens claimed to be due to the receiver.
     * @param _v Cryptographic param v derived from the signature.
     * @param _r Cryptographic param r derived from the signature.
     * @param _s Cryptographic param s derived from the signature.
     */
    function updateClosedChannel(
        MultiChannelData storage data,
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
    inContestPeriod(data) {
        address signerAddress = recoverAddressFromHashAndParameters(_addressOfToken, _nonce, _amount, _r, _s, _v);
        require((signerAddress == data.signerAddress_ && data.recipientAddress_ == msg.sender) || (signerAddress == data.recipientAddress_ && data.userAddress_ == msg.sender));
        require(data.closedNonce_ < _nonce);
        data.closedNonce_ = _nonce;
        data.amountOwed_ = _amount;
    }

    /**
     * @notice After the timeout of the channel after closing has passed, can be called by either participant to withdraw funds.
     * @param data The channel specific data to work on.
     * @param _channelAddress The address of the multichannel to interact with.
     */
    function settle(MultiChannelData storage data, address _channelAddress)
    public
    channelAlreadyClosed(data)
    timeoutOver(data)
    callerIsChannelParticipant(data)
    isSufficientBalance(data, data.amountOwed_, _channelAddress) {
        uint balance = data.token_.balanceOf(_channelAddress);
        uint owedAmount = data.amountOwed_;
        uint returnToUserAmount = balance.minus(owedAmount);

        data.amountOwed_ = 0;

        data.closedBlock_ = 0;

        if (owedAmount > 0) {
            require(data.token_.transfer(data.recipientAddress_, owedAmount));
            // data.token_.transfer(data.recipientAddress_,owedAmount);
        }

        if (returnToUserAmount > 0 && data.shouldReturn_) {
            require(data.token_.transfer(data.userAddress_, returnToUserAmount));
        }

        emit LogChannelSettled(block.number, owedAmount);
    }

    /**
     * @notice Adding new tokens to the respective channel
     * @param data The channel specific data to work on.
     * @param _from The address of the user. After the settle, the funds will be returned here.
     * @param _addressOfSigner The addres of the signer.
     * @param _expiryNumberOfBlocks The timeout period for the given channel.
     */
    function addChannel(MultiChannelData storage data, address _from, address _addressOfSigner, uint _expiryNumberOfBlocks)
    public {
        data.userAddress_ = _from;
        data.signerAddress_ = _addressOfSigner;
        data.recipientAddress_ = msg.sender;
        data.timeout_ = _expiryNumberOfBlocks;
    }

    /**
     * @notice After the timeout of the channel after closing has passed, can be called by either participant to withdraw funds.
     * @param _addressOfToken The address of the token to hash.
     * @param _nonce The nonce of the deposit. Used for avoiding replay attacks.
     * @param _amount The amount of tokens claimed to be due to the receiver.
     * @param r Cryptographic param v derived from the signature.
     * @param s Cryptographic param r derived from the signature.
     * @param v Cryptographic param s derived from the signature.
     */
    function recoverAddressFromHashAndParameters(address _addressOfToken, uint _nonce, uint _amount, bytes32 r, bytes32 s, uint8 v)
    internal view
    returns(address) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 msgHash = keccak256(this, _addressOfToken, _nonce, _amount);
        bytes32 prefixedHash = keccak256(prefix, msgHash);
        return ecrecover(prefixedHash, v, r, s);
    }
}