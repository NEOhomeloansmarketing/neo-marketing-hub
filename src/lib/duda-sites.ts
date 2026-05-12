export interface DudaSite {
  siteId: string;
  name: string;
  url: string;
}

function toProperName(slug: string): string {
  // Remove common suffixes/prefixes
  slug = slug
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/\.loanswithneo\.com$/, "")
    .replace(/\.neohomeloans\.com$/, "")
    .replace(/\.dudasites\.com$/, "")
    .replace(/^www\./, "");

  // If it looks like a domain (has a dot), use it as-is but title-case it
  if (slug.includes(".")) return slug;

  // Split on dash or camelCase boundaries
  return slug
    .replace(/-/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export const DUDA_SITES: DudaSite[] = [
  { siteId: "1e6fa1d5", name: "John Phung", url: "https://johnphung.loanswithneo.com" },
  { siteId: "808d0d0e", name: "Boone Plager", url: "https://booneplager.loanswithneo.com" },
  { siteId: "6c620270", name: "Brad Soll", url: "https://bradsoll.loanswithneo.com" },
  { siteId: "a0f74d30", name: "Lewis Hibbs", url: "https://lewishibbs.loanswithneo.com" },
  { siteId: "c7c9b659", name: "Audra McMahon", url: "" },
  { siteId: "08c24d53", name: "Chase Buckles", url: "https://chasebuckles.loanswithneo.com" },
  { siteId: "6f0d867a", name: "Matt Boulanger", url: "https://mattboulanger.loanswithneo.com" },
  { siteId: "d5b9e808", name: "Jake Ott", url: "https://jakeott.loanswithneo.com" },
  { siteId: "ca8c892b", name: "Mark Barrett", url: "https://markbarrett.loanswithneo.com" },
  { siteId: "02d6f19e", name: "Jenni the Mortgage Girl", url: "https://jennithemortgagegirl.com" },
  { siteId: "fc7cd068", name: "Clear to Close", url: "https://cleartoclose.com" },
  { siteId: "6a808803", name: "Welcome Home Team", url: "https://welcomhometeam.com" },
  { siteId: "6939ae89", name: "Wesley Friedman", url: "https://wesleyfriedman.com" },
  { siteId: "4e4c904c", name: "Home Loan Planners", url: "https://homeloanplanners.com" },
  { siteId: "4f36a68e", name: "Ryan Broughton", url: "https://ryanbroughton.com" },
  { siteId: "f00ffc83", name: "Crystal Clear Path", url: "https://crystalclearpath.com" },
  { siteId: "c876eb02", name: "Team Talbott", url: "https://teamtalbott.com" },
  { siteId: "925c6f78", name: "Andrew Horne", url: "https://andrewhorne.loanswithneo.com" },
  { siteId: "845e4492", name: "Adam Freitas", url: "https://adam-freitas.dudasites.com" },
  { siteId: "dcc0e32d", name: "Lamborne Lending", url: "https://lambornelending.com" },
  { siteId: "92ff4731", name: "Lisa Gustafson", url: "https://lisagustafson.loanswithneo.com" },
  { siteId: "32ef0123", name: "Val Miller", url: "https://valmiller.loanswithneo.com" },
  { siteId: "1820379",  name: "Amber Lee Merz", url: "https://amberleemerz.loanswithneo.com" },
  { siteId: "bf5e4f0e", name: "Jason Fleming", url: "" },
  { siteId: "ad36f96a", name: "Ryan LoCoco", url: "https://ryanlococo.loanswithneo.com" },
  { siteId: "1bfae7e4", name: "Ben Yrabuchin", url: "https://benyrabuchin.loanswithneo.com" },
  { siteId: "c62873c7", name: "Kyle's Home Loans", url: "https://kyleshomeloans.com" },
  { siteId: "3d82b6f8", name: "The Peoples LO", url: "https://www.thepeopleslo.com" },
  { siteId: "4de1fca6", name: "Daryn Fillis", url: "https://darynfillis.loanswithneo.com" },
  { siteId: "dba5055b", name: "Clarkston Mortgage", url: "https://clarkstonmortgage.com" },
  { siteId: "1000dea8", name: "Susie Ataide", url: "https://www.susieataide.com" },
  { siteId: "9d1ae5ff", name: "NEO Stable Group", url: "https://www.neostablegroup.com" },
  { siteId: "1d24cde7", name: "Jim Juergens", url: "https://jimjuergens.com" },
  { siteId: "8b864607", name: "John Yacos", url: "https://johnyacos.loanswithneo.com" },
  { siteId: "b756f84b", name: "Joel Davis", url: "https://joeldavis.loanswithneo.com" },
  { siteId: "6a83ff23", name: "Darren McLellan", url: "https://darrenmclellan.loanswithneo.com" },
  { siteId: "30c60b1b", name: "Montelongo Home Loans", url: "https://www.montelongohomeloans.com" },
  { siteId: "5907c880", name: "Dravland Home Loans", url: "https://www.dravlandhomeloans.com" },
  { siteId: "bd329130", name: "Linda Buchanan", url: "https://lindabuchanan.loanswithneo.com" },
  { siteId: "c023e02a", name: "Tulsa Loan Guy", url: "https://tulsaloanguy.com" },
  { siteId: "5cf55213", name: "Heath Riddle", url: "https://heathriddle.loanswithneo.com" },
  { siteId: "3992561",  name: "Nick Wright", url: "https://nickwright.loanswithneo.com" },
  { siteId: "d7c305e4", name: "Tim Lamb", url: "" },
  { siteId: "041e4127", name: "Lori Heikens", url: "https://loriheikens.loanswithneo.com" },
  { siteId: "eee077af", name: "Heikens Team", url: "https://heikensteam.com" },
  { siteId: "7f659ab0", name: "Jodi Hillmar", url: "https://jodihillmar.loanswithneo.com" },
  { siteId: "eef9dd2c", name: "Loans by Dio", url: "https://loansbydio.com" },
  { siteId: "af56bf91", name: "The Kraeger Team", url: "https://thekraegerteam.com" },
  { siteId: "8cadeea0", name: "Loans by Andrew", url: "https://loansbyandrew.com" },
  { siteId: "b72ed9b2", name: "Nathan Chamblee", url: "https://nathanchamblee.loanswithneo.com" },
  { siteId: "3bd77285", name: "Justin Cotton Team", url: "https://justincottonteam.com" },
  { siteId: "5ebc21a9", name: "Preston Madison", url: "https://prestonmadison.com" },
  { siteId: "34fb587a", name: "Chandra Beach", url: "https://chandrabeach.com" },
  { siteId: "833ce5ff", name: "Brooke Hukill", url: "" },
  { siteId: "f78d366f", name: "Laura Leavy", url: "https://lauraleavy.loanswithneo.com" },
  { siteId: "815275ec", name: "Welty Team", url: "https://weltyteam.mortgage" },
  { siteId: "75b8ea80", name: "Will Mortgage", url: "https://www.will.mortgage" },
  { siteId: "3f2bce03", name: "Hines Mortgage", url: "https://www.hines.mortgage" },
  { siteId: "7ade103c", name: "Cody Mortgage", url: "https://cody.mortgage" },
  { siteId: "8bd0fe5c", name: "Bomar Team", url: "https://bomarteam.mortgage" },
  { siteId: "55a4d7dc", name: "Ronda Holland Loans", url: "https://rondahollandloans.com" },
  { siteId: "93c13b96", name: "Front Door Opportunity", url: "https://frontdooropportunity.com" },
  { siteId: "2e7896ef", name: "Jacquie Smith", url: "" },
  { siteId: "ef5a132c", name: "Stacy Yost", url: "https://stacyyost.com" },
  { siteId: "308fee4e", name: "Home Loans with Sonny", url: "https://homeloanswithsonny.info" },
  { siteId: "ea01f18f", name: "Sheila Merrill Lending", url: "https://sheilamerrilllending.com" },
  { siteId: "8021b522", name: "Team Financial Quest", url: "https://teamfinancialquest.com" },
  { siteId: "22c59b3b", name: "The Morrow Team", url: "https://themorrowteam.com" },
  { siteId: "0ebcbe90", name: "Pinky Mortgage", url: "https://pinkymortgage.com" },
  { siteId: "658254a3", name: "Seven Hills Mortgage Team", url: "https://sevenhillsmortgageteam.com" },
  { siteId: "a02f79a9", name: "Build Wealth with Mike", url: "https://buildwealthwithmike.com" },
  { siteId: "157afccb", name: "Gem Home Team", url: "https://gemhometeam.com" },
  { siteId: "667f74cb", name: "Matt Mortgage", url: "https://mattmortgage.com" },
  { siteId: "c898e43b", name: "Mark Robertson", url: "https://markrobertson.mortgage" },
  { siteId: "3afde52c", name: "Shapiro Mortgage Team", url: "https://shapiromortgageteam.com" },
  { siteId: "9fcba45d", name: "Lisa Fleck Team", url: "https://lisafleckteam.com" },
  { siteId: "cf635ce5", name: "Lena Sazo", url: "https://lenasazo.com" },
  { siteId: "b4e87e42", name: "Ken Watson Lending", url: "https://kenwatsonlending.com" },
  { siteId: "8bb83074", name: "Padron Loans", url: "https://www.padronloans.com" },
  { siteId: "d9d61b55", name: "Reid Loan Team", url: "https://reidloanteam.com" },
  { siteId: "8b9b93c6", name: "Jason Russell", url: "https://jasonrussell.com" },
  { siteId: "d9bf0283", name: "360 Homeowner", url: "https://360homeowner.com" },
  { siteId: "30a4e940", name: "Team Bibel", url: "https://teambibel.com" },
  { siteId: "9e38030e", name: "Edgardo Balentine", url: "" },
  { siteId: "fa2e46d8", name: "Drew Frampton", url: "https://drewframpton.com" },
  { siteId: "764a64d2", name: "Go Maverick Team", url: "https://gomaverickteam.com" },
  { siteId: "8fe8333c", name: "Dan the MTG Man", url: "https://danthemtgman.com" },
  { siteId: "7ac071c9", name: "Mortgage Wealth Pro", url: "https://mortgagewealthpro.com" },
  { siteId: "2e9a3a13", name: "Bryan Little Group", url: "https://bryanlittlegroup.com" },
  { siteId: "bf86e9d9", name: "Go Dream Lender", url: "https://godreamlender.com" },
  { siteId: "588e9423", name: "Steph Loves Mortgages", url: "https://stephlovesmortgages.com" },
  { siteId: "0a382fce", name: "Humphrey Mortgage Team", url: "https://humphreymortgageteam.com" },
  { siteId: "8b799017", name: "Brendon Dumas", url: "https://brendondumas.loanswithneo.com" },
  { siteId: "d33a4b71", name: "Ryan Morrow", url: "https://ryanmorrow.neohomeloans.com" },
  { siteId: "a8e46127", name: "Jon Castellano", url: "https://joncastellano.loanswithneo.com" },
  { siteId: "9f74a000", name: "Jason Baron", url: "https://jasonbaron.loanswithneo.com" },
  { siteId: "7262f9e3", name: "Marty Davenport", url: "https://martydavenport.loanswithneo.com" },
  { siteId: "49d144e9", name: "Mike Malone", url: "https://mikemalone.loanswithneo.com" },
  { siteId: "878567a4", name: "Corey Freels", url: "https://coreyfreels.loanswithneo.com" },
  { siteId: "6ba81ca7", name: "Lisa Wiles", url: "https://lisawiles.loanswithneo.com" },
  { siteId: "6d6ec1bc", name: "Cousins Brothers", url: "https://cousinsbrothers.com" },
  { siteId: "f4ec3ff0", name: "Michael Dean", url: "https://michaeldean.loanswithneo.com" },
  { siteId: "ee626a63", name: "Becky Wishart", url: "https://beckywishart.loanswithneo.com" },
];

// Helper: extract just first/last name for display
export function shortName(name: string): string {
  return name;
}
