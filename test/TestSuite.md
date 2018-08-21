# Tests to Add:

## NonChannelParticipant Test

### Open Channels
* cannot close channel open channel with valid signature  
* cannot close open channel with invalid signature 
* cannot close open channel without signature   
* cannot close a closed channel without signature  
* cannot contest an open channel with valid signature 
* cannot contest an open channel with invalid signature 
* cannot settle open channel 

### Closed Channels 
* cannot close a closed channel with valid signature 
* cannot close a closed channel with an invalid signature 
* cannot close without signature on a closed channel 
* cannot contest closed channel with valid signature 
* cannot contest closed channel with invalid signature 
* cannot contest channel with valid signature after timeout 
* cannot contest channel with invalid signature past timeout 
* cannot settle a closed channel 

## IllegalStateTransition Tests 

### Open Channels
* User should not be able to update an open channel 
* Recipient should not be able to update an open channel 
* User should not be able to contest an open channel 
* Recipient should not be able to contest an open channel 
* User should not be able to settle an open channel 
* Recipient should not be able to settle an open channel 

### Closing Channels 
* User cannot close channel with amount greater than deposited  
* Recipient cannot close channel with amount greater than deposited
* User cannot close channel with signer signed transaction  
* Recipient cannot close channel with address-signed transaction  
* Recipient cannot close with amount greater than deposited  
* User cannot close with self-signed signature
* Recipient cannot sign with self-signed signature 

### Contesting 
* User cannot use the same nonce for contesting a channel 
* Recipient address cannot use the same nonce for contesting a channel  
* User cannot contest an amount greater than deposited 
* Recipient cannot contest amount greater than deposited 
* User cannot contest with self-signed signature 
* Recipient cannot contest with self-signed signature  
* User should not be able to contest after time period is over 
* Recipient should not be able to contest after time period is over 

### Closed Channels 
* User cannot close a closed channel 
* Recipient cannot close a closed channel 
* User cannot close without signature on a closed channel 
* Recipient cannot close without signature on a closed channel  

### Settling 
* User should not be able to settle before time period is over 
* Recipient should not be able to settle before time period is over   

## AdditionalToken Tests 

### Non Channel Participants  
* Should not be able to add tokens 

### Recipient Address  
* Should be able to add tokens 
* Should not be able to add duplicate tokens 
* Cannot close an uninitiialized channel 
* Cannot settle an uninitialized channel

### User Address 
* Should not be able to add tokens  
* Should not be able to add duplicate tokens  
* Cannot close an uninitialized channel 
* Cannot settle an uninitialized channel

## Recipient Valid Transactions Tests 

### Setting up Payment Channel
* Can iniitalize multichannel balance 

### Closing Channel 
* Can close channel with valid signature with amountDeposited-1   
* Can close channel with valid signature less than amountDeposited

### Contesting Channel
* Should be able to contest the channel with valid sig with amountDeposited  

### Settling a Channel 
* Should be able to settle after time period with no tokens remaining in the token  
* Should be allowed to settle channel with tokens remaining in channel 
* 
