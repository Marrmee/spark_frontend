import { ExecutionOptions } from '@/app/utils/interfaces';

export default function enumerateExecutionOptions(executionOption: string) {
  if (executionOption === 'Transaction') {
    return ExecutionOptions.Transaction;
  } else if (executionOption === 'Election') {
    return ExecutionOptions.Election;
  } else if (executionOption === 'Impeachment') {
    return ExecutionOptions.Impeachment;
  } else if (executionOption === 'ParameterChange') {
    return ExecutionOptions.ParameterChange;
  } else if (executionOption === 'NotExecutable') {
    return ExecutionOptions.NotExecutable;
  } else {
    return null;
  }
}
