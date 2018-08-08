# Tests to Add:

## NonChannelParticipant

* non channel participant closing an open channel w/ valid sig
* non channel participant closing an open channel w/ invalid sig
* non channel participant contesting an open channel w/ valid sig
* non channel participant contesting an open channel w/ invalid sig
* non channel participant calling closeWithoutSig on open channel
* non channel participant settling an open channel w/ valid sig
* non channel participant closing a closed channel w/ valid sig
* non channel participant closing a closed channel w/ invalid sig
* non channel participant calling closeWithoutSig on closed channel
* non channel participant contesting a closed channel w/ valid sig
* non channel participant contesting a closed channel w/ invalid sig
* non channel participant settling a closed channel 

## IllegalStateTransition

* Recipient Address: should not update an open channel
* User: should not update an open channel
* Recipient Address: should not settle an open channel
* User: should not settle an open channel 
* User: cannot close channel with amount greater than deposited 
* Recipient Address: cannot close channel with amount greater than deposited
* User: cannot close channel with user-address-signed signature
* Recipient Address: cannot close a channel with a Recipient Address-signed signature 

* User: should not be able to closeWithoutSignature on an open channel 
* Recipient Address: should not be be able to closeWithoutSignature on an open channel 

* User: cannot use same nonce for contesting channel 
* Recipient Address: cannot use same nonce for contesting channel
* User: cannot use same nonce as previously used to close
* Recipient Address:cannot use same nonce as previously used to close 
* Recipient Address: cannot close a closed channel 
* User: cannot close a closed channel 
* User: cannot update a closed channel with amount > deposited
* Recipient Address: cannot update a closed channel with amount > deposited
* User: cannot settle the channel before the time period
* Recipient Address: cannot settle the channel before the time period

## AdditionalToken

* Non channel participant: should not be able to add tokens
* User: cannot add tokens
* Recipient Address should be able to add tokens
* User: cannot add a duplicate token
* Recipient Address: cannot add a duplicate token
* User: cannot close an uninitialized channel
* Recipient Address: cannot close an uninitialized channel
* User: cannot settle an uninitialized channel
* Recipient Address: cannot settle an uninitialized channel
* Should revert if attempting to add non-ERC20 token

## User Valid Transactions  

* User: close channel with amount just under deposited
* User: updates closed channel w/ amount equal to deposited 
* User: settles channel with funds remaining inside (equivalent to 0)

--

* User: close channel with amount less than deposited 
* User: settles channel with funds remaining inside (>0) 

--

* User: close channel with amount just under deposited
* User: updates closed channel w/ amount equal to deposited 
* User: settles with funds not remaining inside (equivalent to 0) 

--

* User: closes channel with amount just under deposited 
* User: settles channel with funds returned 

-- 

* Insert 50 tokens into the channel 
* Close without signature 

## Recipient Address Valid Transactions 

* Recipient Address: closes channel with amount less than deposited 
* Recipient Address: contests channel with amount equivalent to deposited 
* Recipient Address: settles channel with funds remaining inside (equivalent to 0) 

--

* Recipient Address: closes channel with amount less than deposited 
* Recipient Address: contests channel with amount equivalent to deposited 
* Recipient Address: settles channel with funds not remaining inside (equivalent to 0) 

--

* Recipient Address: closes channel with amount less than deposited
* Recipient Address: settles channel with funds remaining in channel 

--

* Recipient Address: closes channel with amount less than deposited
* Recipient Address: settles channel with funds not remaining in channel 
