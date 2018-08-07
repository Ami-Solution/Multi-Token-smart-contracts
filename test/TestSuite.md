# Tests to Add:

## NonChannelParticipant

* non channel participant closing an open channel w/ valid sig
* non channel participant closing an open channel w/ invalid sig
* non channel participant contesting an open channel w/ valid sig
* non channel participant contesting an open channel w/ invalid sig
* non channel participant settling an open channel w/ valid sig
* non channel participant closing a closed channel w/ valid sig
* non channel participant closing a closed channel w/ invalid sig
* non channel participant contesting a closed channel w/ valid sig
* non channel participant contesting a closed channel w/ invalid sig
* non channel participant settling a closed channel 

## IllegalStateTransition

* STACK: should not update an open channel
* User: should not update an open channel
* STACK: should not settle an open channel
* User: should not settle an open channel 
* User: cannot close channel with amount greater than deposited 
* STACK: cannot close channel with amount greater than deposited
* User: cannot close channel with user-address-signed signature
* STACK: cannot close a channel with a STACK-signed signature 
* User: cannot use same nonce for contesting channel 
* STACK: cannot use same nonce for contesting channel
* User: cannot use same nonce as previously used to close
* STACK:cannot use same nonce as previously used to close 
* STACK: cannot close a closed channel 
* User: cannot close a closed channel 
* User: cannot update a closed channel with amount > deposited
* STACK: cannot update a closed channel with amount > deposited
* User: cannot settle the channel before the time period
* STACK: cannot settle the channel before the time period

## AdditionalToken

* Non channel participant: should not be able to add tokens
* User: cannot add tokens
* STACK should be able to add tokens
* User: cannot add a duplicate token
* STACK: cannot add a duplicate token
* User: cannot close an uninitialized channel
* STACK: cannot close an uninitialized channel
* User: cannot settle an uninitialized channel
* STACK: cannot settle an uninitialized channel
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

## STACK Valid Transactions 

* STACK: closes channel with amount less than deposited 
* STACK: contests channel with amount equivalent to deposited 
* STACK: settles channel with funds remaining inside (equivalent to 0) 

* STACK: closes channel with amount less than deposited 
* STACK: contests channel with amount equivalent to deposited 
* STACK: settles channel with funds not remaining inside (equivalent to 0) 

* STACK: closes channel with amount less than deposited
* STACK: settles channel with funds remaining in channel 

* STACK: closes channel with amount less than deposited
* STACK: settles channel with funds not remaining in channel 
