import electionAbi from '@/app/abi/Election.json';
import governorParametersAbi from '@/app/abi/ParameterChange.json';
import impeachmentAbi from '@/app/abi/Impeachment.json';
import transactionAbi from '@/app/abi/Transaction.json';

const abiMap = {
  ['Transaction']: {
    abi: transactionAbi,
  },
  ['ParameterChange']: {
    abi: governorParametersAbi,
  },
  ['Election']: { abi: electionAbi },
  ['Impeachment']: {
    abi: impeachmentAbi,
  },
};

export default abiMap;
