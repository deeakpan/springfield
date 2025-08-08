const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing deployment...\n");

    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Deploying with account: ${deployer.address}`);
    
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH\n`);

    console.log("⚙️  Getting TestContract factory...");
    const TestContract = await ethers.getContractFactory("TestContract");

    console.log("🚀 Deploying test contract...");
    const testContract = await TestContract.deploy("Hello World", {
        gasLimit: 500000,
    });

    console.log("⏳ Waiting for deployment...");
    await testContract.waitForDeployment();

    console.log("\n✅ TEST CONTRACT DEPLOYED SUCCESSFULLY!");
    console.log(`📍 Contract Address: ${await testContract.getAddress()}`);
    console.log(`🔗 Transaction Hash: ${testContract.deploymentTransaction().hash}`);
    
    const message = await testContract.message();
    console.log(`📝 Message: ${message}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test deployment failed:");
        console.error(error);
        process.exit(1);
    }); 