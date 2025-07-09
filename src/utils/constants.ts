// USDC contract address on baseSepolia
export const USDC_CONTRACT = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Minimal ERC20 ABI for balance and transfer
export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
];
