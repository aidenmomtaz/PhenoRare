import xml.etree.ElementTree as ET

def convert_xml_to_txt(xml_file, output_file):
    # Parse the XML file
    tree = ET.parse(xml_file)
    root = tree.getroot()

    # Open the output file for writing
    with open(output_file, "w") as f:
        # Iterate through each disorder
        for disorder in root.findall(".//Disorder"):
            disorder_name = disorder.find("Name[@lang='en']").text  # Extract disorder name
            
            # Iterate through all HPO associations
            for association in disorder.findall(".//HPODisorderAssociation"):
                hpo_id = association.find(".//HPOId").text  # Extract HPO ID
                
                # Write to file in the required format
                f.write(f"{hpo_id}\tOMIM:{disorder_name}\n")

# Example usage
xml_file = "/Users/aidenmomtaz/Downloads/phrank/demo/data/en_product4.xml"  # Replace with actual XML file path
output_file = "output.txt"
convert_xml_to_txt(xml_file, output_file)

print(f"Conversion complete! Output saved to {output_file}")
