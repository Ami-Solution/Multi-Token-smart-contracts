pragma solidity ^0.4.23;


import "./STKChannelLibrary.sol";


/**
Payment Channel between two parties that allows multiple deposits.
Once closed, there is a contest period which allows state updates.
*/
contract STKChannel
{
    using STKChannelLibrary for STKChannelLibrary.STKChannelData;

    modifier channelExists(address addressOfToken) 
    { 
        require(channels[addressOfToken].timeout_ > uint(0));
        _;
    }

    modifier channelDoesNotExist(address addressOfToken) 
    { 
        require(channels[addressOfToken].timeout_ <= uint(0));
        _; 
    }

    /**
     * Storage variables
     */

    mapping (address => STKChannelLibrary.STKChannelData) channels;
    address recipientAddress = msg.sender;
    event LogChannelOpened(address from, address to, uint blockNumber);
    event LogChannelClosed(uint blockNumber, address closer, uint amount);
    event LogDeposited(address depositingAddress, uint amount);
    event LogChannelContested(uint amount, address caller);

    /**
     * @dev Contract constructor
     * @param _from The user address in the contract.
     * @param _addressOfSigner The signer address in the contract.
     * @param _addressOfToken The address when the ERC20 token is deployed.
     * @param _expiryNumberOfBlocks The time in blocks of waiting after channel closing after which it can be settled.
     */
    constructor (
        address _from,
        address _addressOfSigner,
        address _addressOfToken,
        uint _expiryNumberOfBlocks)
        public
    {
        channels[_addressOfToken].token_ = ERC20Token(_addressOfToken);
        channels[_addressOfToken].userAddress_ = _from;
        channels[_addressOfToken].signerAddress_ = _addressOfSigner;
        channels[_addressOfToken].recipientAddress_ = msg.sender;
        channels[_addressOfToken].timeout_ = _expiryNumberOfBlocks;

        emit LogChannelOpened(channels[_addressOfToken].userAddress_, channels[_addressOfToken].recipientAddress_, block.number);
    }

    /**
    * @notice Function to close the payment channel.
    * @param _nonce The nonce of the deposit. Used for avoiding replay attacks.
    * @param _amount The amount of tokens claimed to be due to the receiver.
    * @param _v Cryptographic param v derived from the signature.
    * @param _r Cryptographic param r derived from the signature.
    * @param _s Cryptographic param s derived from the signature.
    */
    function close(
        address _addressOfToken,
        uint _nonce,
        uint _amount,
        uint8 _v,
        bytes32 _r,
        bytes32 _s)
        external
        channelExists(_addressOfToken)
    {
        channels[_addressOfToken].close(address(this), _addressOfToken, _nonce, _amount, _v,_r,_s);
        emit LogChannelClosed(block.number, msg.sender, _amount);
    }

    /**
    * @notice Function to close the payment channel without a signature.
    */
    function closeWithoutSignature(
        address _addressOfToken)
        external
        channelExists(_addressOfToken)
    {
        channels[_addressOfToken].closeWithoutSignature();
        emit LogChannelClosed(block.number, msg.sender, channels[_addressOfToken].amountOwed_);
    }

    /**
    * @notice Function to contest the closing state of the payment channel. Will be able to be called for a time period (in blocks) given by timeout after closing of the channel.
    * @param _nonce The nonce of the deposit. Used for avoiding replay attacks.
    * @param _amount The amount of tokens claimed to be due to the receiver.
    * @param _v Cryptographic param v derived from the signature.
    * @param _r Cryptographic param r derived from the signature.
    * @param _s Cryptographic param s derived from the signature.
    */
    function updateClosedChannel(
        address _addressOfToken,
        uint _nonce,
        uint _amount,
        uint8 _v,
        bytes32 _r,
        bytes32 _s)
        external
        channelExists(_addressOfToken)
    {
        channels[_addressOfToken].updateClosedChannel(address(this), _addressOfToken, _nonce, _amount, _v, _r, _s);
        emit LogChannelContested(_amount, msg.sender);
    }

    /**
    * @notice After the timeout of the channel after closing has passed, can be called by either participant to withdraw funds.
    */
    function settle( address _addressOfToken, bool _returnToken)
        external
        channelExists(_addressOfToken)        
    {
        channels[_addressOfToken].settle(address(this), _returnToken);
    }

    function addChannel(address _addressOfToken, address _from, address _addressOfSigner, uint _expiryNumberOfBlocks)
        external
        channelDoesNotExist(_addressOfToken)
    {
        require(recipientAddress == msg.sender);
        channels[_addressOfToken].token_ = ERC20Token(_addressOfToken);
        channels[_addressOfToken].addChannel(_from, _addressOfSigner, _expiryNumberOfBlocks);
    }

    function getChannelData(address _addressOfToken) view public returns (address, address, address, uint, uint, uint, uint, uint) {
        var channel = channels[_addressOfToken];
        return (channel.userAddress_,
        channel.signerAddress_,
        channel.recipientAddress_,
        channel.timeout_,
        channel.amountOwed_,
        block.number,
        channel.closedBlock_,
        channel.closedNonce_);
    }
}
