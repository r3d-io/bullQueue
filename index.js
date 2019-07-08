const Web3 = require('web3');
const dotenv = require('dotenv');
var Bull = require('bull');
var fs = require('fs');
dotenv.config();

let testnet = `https://rinkeby.infura.io/${process.env.INFURA_ACCESS_TOKEN}`
let web3 = new Web3(new Web3.providers.HttpProvider(testnet))

async function getBlockDetail(block_address) {
  try {
    let blockDetail = await web3.eth.getBlock(block_address)
    return blockDetail.transactions
  }
  catch (error) {
    console.log(`unable to get block details ${error}`)
  }
}

function addQueue(transactions, transactionQueue) {
  transactions.forEach(trans => {
    transactionQueue.add({ trans });
    console.log(`Added transaction ${trans}`)
  });
}

async function processTransaction(block_address, transArray, transactionQueue) {
  let transactionCount = await web3.eth.getBlockTransactionCount(block_address)
  console.log(`transaction count ${transactionCount} for queue ${block_address}`)
  try {
    transactionQueue.process(async (job, jobDone) => {
      let trans = job.data.trans
      let transObject = await web3.eth.getTransaction(trans)
      transArray.push(transObject)
      console.log(`proccessed transaction ${trans} on queue ${block_address}`)
      jobDone();
      // console.log(`length ${transArray.length} === ${transactionCount}`)
      if (transArray.length === transactionCount) {
        writeToFile(block_address, transArray)
        transactionQueue.close()
      }
    });
  }
  catch (error) {
    console.log(`Unable to process transaction due to ${error}`)
  }
}

async function queueCompletion(transArray, transactionQueue) {
  transactionQueue.on('completed', (job, result) => {
    job.remove();
    // console.log(job)
    console.log(`Job with id ${job.id} has been completed`);
  })
}

function writeToFile(block_address, transArray) {
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

async function main(block_arr) {
  let transactionQueue = {}
  let transArray = {}
  block_arr.forEach(async address => {
    transArray[address] = []
    transactionQueue[address] = new Bull(address);
    transactions = await getBlockDetail(address)
    addQueue(transactions, transactionQueue[address])
    processTransaction(address, transArray[address], transactionQueue[address])
    queueCompletion(transArray[address], transactionQueue[address])
  });
}

let block_arr = ["0xd6138375419d0d82e333b2e84998f88eb42563dcf46cbfa19eefbecdcd5935e7",
  "0xcb7695375b0948528396db9a4377923b857de1823273585fa70fca3e7fc8b19d",
  "0x8e4ec07e3f9de5faf12fa9e25afe86a9830dbea20d95c18b7a7d7c951619f7e5"
]
main(block_arr)