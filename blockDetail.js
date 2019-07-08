"use strict";

const Web3 = require('web3');
const dotenv = require('dotenv');
var Bull = require('bull');
var fs = require('fs');
dotenv.config();

class BlockDetail {

  constructor(queueName, testnet) {
    this.web3 = new Web3(new Web3.providers.HttpProvider(testnet))
    this.transactionQueue = new Bull(queueName);
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
    transactions.forEach(trans => {
      transactionQueue.add({ trans: trans, block: address });
      console.log(`Added transaction ${trans} on queue ${address}`)
    });
  }

  async processTransaction(transArray, transactionQueue) {
    try {
      transactionQueue.process(async (job, jobDone) => {
        let transactionCount = await this.web3.eth.getBlockTransactionCount(job.data.block)
        let trans = job.data.trans
        let transObject = await this.web3.eth.getTransaction(trans)
        transArray[job.data.block].push(transObject)
        console.log(`proccessed transaction ${trans} on queue ${job.data.block}`)
        jobDone();
        if (transArray[job.data.block].length === transactionCount) {
          this.writeToFile(job.data.block, transArray)
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
      console.log(`Job with id ${job.id} has been completed`);
    })
  }

  writeToFile(block_address, transArray) {
    var dir = './block-transaction';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    var json = JSON.stringify(transArray);
    try {
      fs.writeFile(`${dir}/${block_address}.json`, json, 'utf8', function (err) {
        if (err) throw err;
        console.log(`completed file write for ${block_address}`);
        // process.exit()
      });
    }
    catch (error) {
      console.log(`Unable to write to the file due to${error}`)
    }
  }
}

async function main(block_arr) {
  let testnet = `https://rinkeby.infura.io/${process.env.INFURA_ACCESS_TOKEN}`
  let transArray = {}
  const bd = new BlockDetail('Ethereum Queue', testnet)
  block_arr.forEach(async address => {
    transArray[address] = []
    let transactions = await bd.getBlockDetail(address)
    bd.addQueue(address, transactions, bd.transactionQueue)
  });
  bd.processTransaction(transArray, bd.transactionQueue)
  bd.queueCompletion(bd.transactionQueue)
}

let block_arr = ["0xd6138375419d0d82e333b2e84998f88eb42563dcf46cbfa19eefbecdcd5935e7",
  "0xcb7695375b0948528396db9a4377923b857de1823273585fa70fca3e7fc8b19d",
  "0x8e4ec07e3f9de5faf12fa9e25afe86a9830dbea20d95c18b7a7d7c951619f7e5"
]
main(block_arr)

module.exports = { BlockDetail }