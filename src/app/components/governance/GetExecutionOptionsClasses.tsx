export default function getExecutionOptionsClasses(type: string) {
  const baseClasses = "backdrop-blur-sm backdrop-filter font-medium";
  
  switch (type?.toLowerCase()) {
    case 'transaction':
      return `${baseClasses} uppercase bg-gradient-to-r from-steelBlue/20 to-steelBlue/10 
        text-steelBlue hover:text-tropicalBlue border border-steelBlue/30 shadow-glow-blue-faint`;
    case 'election':
      return `${baseClasses} uppercase bg-gradient-to-r from-orange-500/20 to-orange-500/10 
        text-orange-400 border border-orange-500/30 shadow-glow-orange-faint`;
    case 'impeachment':
      return `${baseClasses} uppercase bg-gradient-to-r from-highlightRed/20 to-highlightRed/10 
        text-highlightRed border border-highlightRed/30 shadow-glow-red-faint`;
    case 'parameterchange':
      return `${baseClasses} uppercase bg-gradient-to-r from-pineGreen/20 to-pineGreen/10 
        text-emerald-400 border border-pineGreen/30 shadow-glow-green-faint`;
    case 'notexecutable':
      return `${baseClasses} uppercase bg-gradient-to-r from-gray-200/20 to-gray-200/10 
        text-gray-400 border border-gray-200/30`;
    default:
      return `${baseClasses} uppercase bg-gradient-to-r from-gray-200/20 to-gray-200/10 
        text-gray-400 border border-gray-200/30`;
  }
}
