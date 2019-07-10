"use strict";

const Web3 = require('web3');
const dotenv = require('dotenv');
var Bull = require('bull');
var fs = require('fs');
const chalk = require('chalk');
var log4js = require('log4js');
var logger = log4js.getLogger();
dotenv.config();
logger.level = 'error';

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
      logger.error(`Unable to get block details ${chalk.blue(error)}`)
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
    catch(error){
      logger.error(`Unable to add trnasction to queue because ${chalk.blue(error)}`)
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
        }
      });
    }
    catch (error) {
      logger.error(`Unable to process transaction due to ${chalk.blue(error)}`)
    }
  }

  async queueCompletion(transactionQueue) {
    transactionQueue.on('completed', (job, result) => {
      job.remove();
      if (this.output)
        console.log(`Job with id ${job.id} has been completed`);
    })
  }

  writeToFile(block_address, txnArray) {
    if (!fs.existsSync(this.dirPath)) {
      fs.mkdirSync(this.dirPath);
    }
    var json = JSON.stringify(txnArray);
    try {
      fs.writeFile(`${this.dirPath}/${block_address}.json`, json, 'utf8', function (err) {
        if (err) throw err;
        console.log(`completed file write for ${block_address}`);
      });
    }
    catch (error) {
      logger.error(`Unable to write to the file due to${chalk.blue(error)}`)
    }
  }

  async main(block_arr) {
    let blockTxnArray = {}
    try {
      block_arr.forEach(async blochHash => {
        blockTxnArray[blochHash] = []
        let transactions = await this.getBlockDetail(blochHash)
        if (typeof transactions === 'undefined' || transactions.length <= 0)
          throw new Error ("Empty array receieved")
        this.addQueue(blochHash, transactions, this.transactionQueue)
      });
      this.processTransaction(blockTxnArray, this.transactionQueue)
      this.queueCompletion(this.transactionQueue)
    }
    catch (error) {
      logger.error(`Unable to execute program due to ${chalk.blue(error)}`)
    }
  }
}

module.exports = { BlockDetailQueue }