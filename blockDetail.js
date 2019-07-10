"use strict";

const Web3 = require('web3');
const dotenv = require('dotenv');
var Bull = require('bull');
var fs = require('fs');
dotenv.config();

class BlockDetailQueue {

  constructor(queueName, testnet, dirPath, output) {
    if (!output)
      console.log("program executing please wait")
    this.web3 = new Web3(new Web3.providers.HttpProvider(testnet))
    this.transactionQueue = new Bull(queueName);
    this.dirPath = dirPath
    this.output = output
  }

  async getBlockDetail(block_address) {
    try {
      let blockDetail = await this.web3.eth.getBlock(block_address)
      return blockDetail.transactions
    }
    catch (error) {
      console.log(`unable to get block details ${error}`)
    }
  }

  addQueue(address, transactions, transactionQueue) {
    try {
      transactions.forEach(trans => {
        transactionQueue.add({ trans: trans, block: address });
        if (this.output)
          console.log(`Added transaction ${trans} on queue ${address}`)
      });
    }
    catch{
      console.log('No transaction recieved please check your internet connection')
    }
  }

  async processTransaction(transArray, transactionQueue) {
    try {
      transactionQueue.process(async (job, jobDone) => {
        let transactionCount = await this.web3.eth.getBlockTransactionCount(job.data.block)
        let trans = job.data.trans
        let transObject = await this.web3.eth.getTransaction(trans)
        transArray[job.data.block].push(transObject)
        if (this.output)
          console.log(`proccessed transaction ${trans} on queue ${job.data.block}`)
        jobDone();
        if (transArray[job.data.block].length === transactionCount) {
          this.writeToFile(job.data.block, transArray)
          return true
          // transactionQueue.close()
        }
      });
    }
    catch (error) {
      console.log(`Unable to process transaction due to ${error}`)
    }
  }

  async queueCompletion(transactionQueue) {
    transactionQueue.on('completed', (job, result) => {
      job.remove();
      if (this.output)
        console.log(`Job with id ${job.id} has been completed`);
    })
  }

  writeToFile(block_address, transArray) {
    if (!fs.existsSync(this.dirPath)) {
      fs.mkdirSync(this.dirPath);
    }
    var json = JSON.stringify(transArray);
    try {
      fs.writeFile(`${this.dirPath}/${block_address}.json`, json, 'utf8', function (err) {
        if (err) throw err;
        console.log(`completed file write for ${block_address}`);
        // process.exit()
      });
    }
    catch (error) {
      console.log(`Unable to write to the file due to${error}`)
    }
  }

  async blockDetail(block_arr) {
    let transArray = {}
    block_arr.forEach(async address => {
      transArray[address] = []
      let transactions = await this.getBlockDetail(address)
      this.addQueue(address, transactions, this.transactionQueue)
    });
    this.processTransaction(transArray, this.transactionQueue)
    this.queueCompletion(this.transactionQueue)
  }
}

function main(block_arr) {
  let testnet = `https://rinkeby.infura.io/${process.env.INFURA_ACCESS_TOKEN}`
  let queueName = 'Ethereum Queue'
  let dirPath = './block-transaction';
  const bd = new BlockDetailQueue(queueName, testnet, dirPath, false)
  bd.blockDetail(block_arr)
}

let block_arr = ["0xd6138375419d0d82e333b2e84998f88eb42563dcf46cbfa19eefbecdcd5935e7",
  "0xcb7695375b0948528396db9a4377923b857de1823273585fa70fca3e7fc8b19d",
  "0x8e4ec07e3f9de5faf12fa9e25afe86a9830dbea20d95c18b7a7d7c951619f7e5"
]
main(block_arr)

module.exports = { BlockDetailQueue }