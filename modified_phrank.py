from collections import defaultdict
import math
import xml.etree.ElementTree as ET
from collections import defaultdict

def load_maps(human_phenotype_map_file):
    hpo_file = open(human_phenotype_map_file)
    child_to_parent = defaultdict(list)
    parent_to_children = defaultdict(list)
    for hpo_line in hpo_file:
        hpo_tokens = hpo_line.strip().split("\t")
        child = hpo_tokens[0]
        parent = hpo_tokens[1]
        child_to_parent[child].append(parent)
        parent_to_children[parent].append(child)
    return child_to_parent, parent_to_children

def load_term_hpo(term_to_hpo_file):
    term_hpo_file = open(term_to_hpo_file)
    term_pheno_map = defaultdict(list)
    for term_line in term_hpo_file:
        term_hpo_tokens = term_line.strip().split("\t")
        hpo = term_hpo_tokens[0]
        term = term_hpo_tokens[1]
        term_pheno_map[term].append(hpo)
    term_hpo_file.close()
    return term_pheno_map

def closure(phenos, child_to_parent, freqs):
    all_ancestors = {}
    for i in range(len(phenos)):
        pheno = phenos[i]
        freq = freqs[i]
        all_ancestors = all_ancestors | get_all_ancestors(pheno, child_to_parent,freq) | {pheno: 1+(freq/5)}
    return all_ancestors

def get_all_ancestors(hpo_term, child_to_parent_map,freq):
    ancestors = {}
    term = hpo_term
    parents = child_to_parent_map.get(term, [])[:]
    while parents:
        parent = parents.pop()
        ancestors[parent] = freq
        parents = parents + child_to_parent_map.get(parent, [])
    return ancestors

def compute_gene_disease_pheno_map(disease_gene_map, disease_pheno_map):
    gene_pheno_map = defaultdict(set)    
    for disease, genes in disease_gene_map.items():
        phenos = disease_pheno_map.get(disease)
        for gene in genes:
            for pheno in phenos:
                gene_pheno_map[gene].add(pheno)
    return gene_pheno_map

def load_disease_gene(disease_to_gene_filename):
    disease_to_gene = defaultdict(set)
    f = open(disease_to_gene_filename)
    for line in f:
        tokens = line.strip().split("\t")
        gene = tokens[0]
        disease = tokens[1]
        disease_to_gene[disease].add(gene)
    return disease_to_gene

def load_gene_symbol_map(GENE_TO_SYMBOL):
    gene_to_symbol_map = {}
    f = open(GENE_TO_SYMBOL)
    for line in f:
        gene_data = line.strip().split("\t")
        gene_to_symbol_map[gene_data[0]] = gene_data[1]
    return gene_to_symbol_map



class Phrank:
    @staticmethod
    def compute_information_content(annotations_map, child_to_parent_map):
        information_content, marginal_information_content = {}, {}
        annotatedDiseaseCt = 0
        associated_phenos = defaultdict(set)
        for disease, phenos in annotations_map.items():
            annotatedDiseaseCt += 1
            dummy_freqs = [0 for element in range(len(phenos))]
            all_ancestors = closure(phenos, child_to_parent_map, dummy_freqs)

            # for each ancestor increment the count since this pheno is now associated with the specified gene
            for pheno in all_ancestors:
                associated_phenos[pheno].add(disease)

        phenos = associated_phenos.keys()
        for pheno in phenos:
            information_content[pheno] = -math.log(1.0*len(associated_phenos[pheno])/annotatedDiseaseCt, 2) if len(associated_phenos[pheno]) else 0

        for pheno in phenos:
            parent_phenos = child_to_parent_map[pheno]
            parent_entropy = 0
            if len(parent_phenos) == 1:
                parent_entropy = information_content[parent_phenos[0]]
            elif len(parent_phenos) > 1:
                list_of_phenosets = [associated_phenos[parent] for parent in parent_phenos]
                parent_set = set([])
                for phenoset in list_of_phenosets:
                    parent_set = parent_set | phenoset if parent_set else phenoset
                parent_entropy = -math.log(1.0*len(parent_set)/annotatedDiseaseCt, 2) if len(parent_set) else 0
            marginal_information_content[pheno] = information_content[pheno] - parent_entropy
        return information_content, marginal_information_content

    def __init__(self, dagfile, diseaseannotationsfile=None, diseasegenefile=None, geneannotationsfile=None):
        """Initialize Phrank object with the disease annotations file or gene annotations file"""
        self._child_to_parent, self._parent_to_children = load_maps(dagfile)
        if diseaseannotationsfile and diseasegenefile:
            self._disease_pheno_map = load_term_hpo(diseaseannotationsfile)
            self._IC, self._marginal_IC = Phrank.compute_information_content(self._disease_pheno_map, self._child_to_parent)
            self._gene_and_disease  = True
        elif geneannotationsfile:
            self._gene_pheno_map = load_term_hpo(geneannotationsfile)
            self._IC, self._marginal_IC = Phrank.compute_information_content(self._gene_pheno_map, self._child_to_parent)
            self._gene_and_disease = False

    def compute_phenotype_match(self, patient_phenotypes, query_phenotypes, query_frequencies):
        """
        input: patient_phenotypes, query phenotypes - two lists of phenotypes
        output: score - Phrank score measuring the similarity between the two sets
        """
        #change_to_primary, patient_genes, disease_gene_map, disease_pheno_map, child_to_parent, disease_marginal_content)
        dummy_freqs = [0 for element in range(len(patient_phenotypes))]
        all_patient_phenotypes = closure(patient_phenotypes, self._child_to_parent,dummy_freqs)
        all_query_phenotypes = closure(query_phenotypes, self._child_to_parent,query_frequencies)
        similarity_score = 0
        for phenotype in all_patient_phenotypes.keys() & all_query_phenotypes.keys():
            similarity_score += self._marginal_IC.get(phenotype, 0) * all_query_phenotypes[phenotype]
        return similarity_score
    
DAG="/Users/aidenmomtaz/Downloads/phrank/demo/data/hpodag.txt"
DISEASE_TO_PHENO="/Users/aidenmomtaz/Downloads/phrank/demo/data/rare_diseases.txt"
XML = "/Users/aidenmomtaz/Downloads/phrank/demo/data/en_product4.xml"
DISEASE_TO_GENE="/Users/aidenmomtaz/Downloads/phrank/demo/data/gene_to_disease.build127.txt"
GENE_TO_PHENO="/Users/aidenmomtaz/Downloads/phrank/demo/data/gene_to_pheno.amelie.txt"
p_hpo = Phrank(DAG, diseaseannotationsfile=DISEASE_TO_PHENO, diseasegenefile=DISEASE_TO_GENE)

# defining the phenotype sets
patient_phenotypes = ['HP:0000027','HP:0000098','HP:0000218','HP:0002088','HP:0002099','HP:0001945','HP:0000719']

# Read the Rare Diseases XML File and create a dict of disease: (phenotypes, frequencies)
# Check similarity to disease
tree = ET.parse(XML)
root = tree.getroot()
# Dictionary to store disorder names as keys and list of (HPOId, Frequency) as values
disorder_dict = {}
# Iterate through all disorders
for disorder in root.findall(".//Disorder"):
    disorder_name = disorder.find("Name[@lang='en']").text  # Extract disorder name
    hpo_associations = disorder.findall(".//HPODisorderAssociation")
    # List to store tuples of (HPOId, Frequency)
    hpo_list = []
    for association in hpo_associations:
        hpo_id = association.find(".//HPOId").text  # Extract HPOId
        frequency_element = association.find(".//HPOFrequency/Name[@lang='en']")
        frequency = frequency_element.text if frequency_element is not None else "Unknown"  # Extract frequency
        if frequency == "Obligate (100%)":
            frequency = 5
        elif frequency == "Very frequent (99-80%)":
            frequency = 4
        elif frequency == "Frequent (79-30%)":
            frequency = 3
        elif frequency == "Occasional (29-5%)":
            frequency = 2
        elif frequency == "Very rare (<4-1%)":
            frequency = 1
        else:
            frequency = 0
        hpo_list.append((hpo_id, frequency))

    # Store in dictionary
    disorder_dict[disorder_name] = hpo_list

print(disorder_dict['48,XYYY syndrome'])

disease_similarities = {}
for disease in disorder_dict:
    disease_phenotypes = []
    disease_freqs = []
    for pheno in disorder_dict[disease]:
        disease_phenotypes.append(pheno[0])
        disease_freqs.append(pheno[1])
    disease_similarities[disease] = p_hpo.compute_phenotype_match(patient_phenotypes,disease_phenotypes,disease_freqs)
disease_similarities = sorted(disease_similarities.items(), key=lambda item: item[1])
print((disease_similarities[:-6:-1]))
     
