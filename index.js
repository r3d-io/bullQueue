const Web3 = require('web3');
const dotenv = require('dotenv');
var Bull = require('bull');
var fs = require('fs');
dotenv.config();

let transArray = []
let block_address = process.argv[2] || "0xcb7695375b0948528396db9a4377923b857de1823273585fa70fca3e7fc8b19d"
let testnet = `https://rinkeby.infura.io/${process.env.INFURA_ACCESS_TOKEN}`
let web3 = new Web3(new Web3.providers.HttpProvider(testnet))
let transactionQueue = new Bull('Transaction-Queue');

function addQueue(transactions) {
  transactions.forEach(trans => {
    transactionQueue.add({ trans });
    console.log(`Added transaction ${trans}`)
  });
}

async function processTransaction() {
  let transactionQueue = new Bull('Transaction-Queue');
  let transactionCount = await web3.eth.getBlockTransactionCount(block_address)
  transactionQueue.process(async (job, jobDone) => {
    let trans = job.data.trans
    let transObject = await web3.eth.getTransaction(trans)
    transArray.push(transObject)
    console.log(`proccessed transaction ${trans}`)
    jobDone();
    // console.log(`length ${transArray.length} === ${transactionCount}`)
    if (transArray.length === transactionCount)
      writeToFile(block_address)
  });
}

async function queueCompletion() {
  transactionQueue.on('global: completed', (job, result) => {
    console.log(transArray)
    job.remove();
    transactionQueue.close()
    console.log(`Job with id ${result} has been completed`);
  })
}

async function getBlockDetail(block_address) {
  let blockDetail = await web3.eth.getBlock(block_address)
  return blockDetail.transactions
}

function writeToFile(block_address) {
  console.log(`Executing file write`)
  var json = JSON.stringify(transArray);
  fs.writeFile(`${block_address}.json`, json, 'utf8', function (err) {
    if (err) throw err;
    console.log('complete');
    process.exit()
  });
}

async function main() {
  transactions = await getBlockDetail(block_address)
  addQueue(transactions)
  processTransaction()
  queueCompletion()
}

main()