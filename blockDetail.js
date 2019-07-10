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

  constructor(blockQueueName, txnQueueName, testnet, dirPath, output) {
    if (output)
      logger.level = 'info';
    console.log("program executing please wait")
    this.web3 = new Web3(new Web3.providers.HttpProvider(testnet))
    this.transactionQueue = new Bull(txnQueueName);
    this.blockQueue = new Bull(blockQueueName);
    this.dirPath = dirPath
    this.output = output
  }

  async getBlockDetail(blockHash) {
    try {
      let blockDetail = await this.web3.eth.getBlock(blockHash)
      return blockDetail.transactions
    }
    catch (error) {
      logger.error(`Unable to get block details ${chalk.red(error)}`)
    }
  }

  addTxnQueue(hash, transactions, transactionQueue) {
    try {
      transactions.forEach(txn => {
        transactionQueue.add({ transaction: txn, block: hash }, { removeOnComplete: true, attempts: 5 });
        logger.info(`Added transaction ${chalk.cyan(txn)} \n on queue ${chalk.yellow(hash)}`)
      });
    }
    catch (error) {
      logger.error(`Unable to add trnasction to queue because ${chalk.red(error)}`)
    }
  }

  addBlockQueue(blockHash, blockQueue) {
    try {
      blockQueue.add({ block: blockHash }, { removeOnComplete: true, attempts: 5 });
      logger.info(`Added Block ${chalk.gray(blockHash)}`)
    }
    catch (error) {
      logger.error(`Unable to add block to queue because ${chalk.red(error)}`)
    }
  }

  async processTransaction(blockTxnObj, transactionQueue) {
    try {
      transactionQueue.process(async (job, jobDone) => {
        let txn = job.data.transaction
        let blockHash = job.data.block
        let txnObject = await this.web3.eth.getTransaction(txn)
        blockTxnObj[blockHash].txnArray.push(txnObject)
        logger.info(`proccessed transaction ${chalk.cyan(txn)} \n on queue ${chalk.yellow(blockHash)}`)
        jobDone();
        if (blockTxnObj[blockHash].txnArray.length === blockTxnObj[blockHash].count)
          this.writeToFile(blockHash, blockTxnObj[blockHash].txnArray)
      });
    }
    catch (error) {
      logger.error(`Unable to process transaction due to ${chalk.red(error)}`)
    }
  }

  async queueCompletion(transactionQueue) {
    transactionQueue.on('completed', (job, result) => {
      job.remove();
      logger.info(`Job with id ${job.id} has been completed`);
    })
  }

  writeToFile(blockHash, txnArray) {
    try {
      if (!fs.existsSync(this.dirPath)) {
        fs.mkdirSync(this.dirPath);
      }
      var json = JSON.stringify(txnArray);
      fs.writeFile(`${this.dirPath}/${blockHash}.json`, json, 'utf8', function (err) {
        if (err) throw err;
        console.log(chalk.red(`completed file write for ${blockHash}`));
      });
    }
    catch (error) {
      logger.error(`Unable to write to the file due to ${chalk.red(error)}`)
    }
  }

  async main(blockHashes) {
    let blockTxnObj = {}
    blockHashes.forEach(blockHash => {
      this.addBlockQueue(blockHash, this.blockQueue)
    })
    try {
      this.blockQueue.process(async (job, jobDone) => {
        let blockHash = job.data.block
        blockTxnObj[blockHash] = {}
        blockTxnObj[blockHash].txnArray = []
        blockTxnObj[blockHash].count = await this.web3.eth.getBlockTransactionCount(blockHash)
        let transactions = await this.getBlockDetail(blockHash)
        if (typeof transactions === 'undefined' || transactions.length <= 0)
          throw new Error("Empty array receieved")
        this.addTxnQueue(blockHash, transactions, this.transactionQueue)
        jobDone()
      });
      this.processTransaction(blockTxnObj, this.transactionQueue)
    }
    catch (error) {
      logger.error(`Unable to execute program due to ${chalk.red(error)}`)
    }
  }
}

module.exports = { BlockDetailQueue }