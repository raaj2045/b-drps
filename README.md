# Blockchain-based Decentralized Research Publishing System (B-DRPS)

## How to run the Dapp?

1. Install Prerequisites

- Download and install NodeJS from [Download](https://nodejs.org/en/download/)

- Install Visual Studio Code from [Download](https://code.visualstudio.com/download)

- Install Ganache From  [Download](https://trufflesuite.com/ganache/)

- Install Metamask from [Download](https://metamask.io/download/)

2. Make account on Web3.Storage

- Get Api Key from Web3.Storage[Web3.Storage](https://web3.storage/)

- Register and login to your account and Click on Account/create Api Token

- Make .env file in a App directory and copy Api token into it

```
REACT_APP_WEB3_STORAGE_API_KEY = PASTE YOUR TOKEN HERE

```

2. Clone the Project

```
$ git clone https://github.com/Rushik-Ghuntala/blockchain-based-decentralized-research-publishing-system.git

```
3. Install all the Dependencies

```
$ cd blockchain-based-decentralized-research-publishing-system

$ npm install

```
4. Run the local blockchain using desktop version of ganache 

5. Compile and migrate all the contracts using the truffle 

```
$ truffle migrate --reset

```
6. Log in your MetaMask and import the demo accounts to interact with the App.

- For the demo accounts go to the ganache desktop make one demo workspace and you can see 10 demo accounts with 100 ETH

- Now click on key icon you get private key of the accounts and import it to the metamask, add minimum 8 accounts for perfect testing.

- For more information, [click here](https://www.geeksforgeeks.org/how-to-set-up-ganche-with-metamask/)

7. Now run the application 

```
$ npm start

```

8. now you are able to do interaction with the application.

Note: Here, we make journal is pre-registered so if you want to do testing then uncomment the line no. 36 in signup.js file because in the code the journal is not register he can log in directly.