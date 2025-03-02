import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import axios from "axios";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

const Stack = createStackNavigator();

const HomeScreen = ({ navigation }) => {
  const [input, setInput] = useState("");
  const [inputs, setInputs] = useState([]);
  const [response, setResponse] = useState("");
  const [responseTexts, setResponseTexts] = useState([]); 

  const addPhenotype = () => {
    if (input.trim()) {
      setInputs(prevInputs => [...prevInputs, input.trim()]); // ✅ Safe update
    //setInput(""); // Clear input field after adding
    console.log("inputs hereskies")
    console.log(input)
    }
  };
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const callOpenAIWithRetry = async (userInput, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await callOpenAI(userInput);
        } catch (error) {
            if (error.response?.status === 429 && i < retries - 1) {
                console.warn("Rate limit exceeded. Retrying...");
                await delay(5000); // Wait 5 sec before retrying
            } else {
                throw error;
            }
        }
    }
};

  const callOpenAI = async () => {
    const API_KEY = "sk**4A"; // Replace with your actual API key
    const API_URL = "https://api.openai.com/v1/chat/completions";

    try {
      console.log("second input"); 

      console.log(input); 
      const response = await axios.post(
        API_URL,
        {
          model: "gpt-4o", // Or use "gpt-3.5-turbo"
          messages: [
            { role: "system", content: "You are a medical assistant that translates clinical phenotypes into Human Phenotype Ontology (HPO) terms." },
            { role: "user", content: `Translate this phenotype into an HPO term, only outputting the HPO term and no other text: ${input}` }
          ],
          max_tokens: 100,
        },
        {
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      setResponseTexts((prevInputs => [...prevInputs, response.data.choices[0].message.content.trim()]));
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      setResponseTexts("Error getting a response. Check your API key and network.");
    }
  };

  const translatePhenotype = async (input) => {
    addPhenotype()
    console.log("hiiii")
    console.log(inputs)
    console.log("yooo")
    console.log(input)
    await callOpenAIWithRetry(input);
    
  };

  const callPythonFunction = async () => {
    console.log()
    if (inputs.length === 0) return; // Prevent empty submission
    try {
      console.log("in here", responseTexts)
      const res = await axios.post("http://127.0.0.1:8000/process", {
        phenotypes: responseTexts, // Send the list to the backend
      });
      const { d1, d2, d3, d4, d5, s1, s2, s3, s4, s5 } = res.data;
      setResponse(res.data.message);
      navigation.navigate("ResultScreen", { d1,d2,d3,d4,d5,s1, s2,s3,s4,s5 });
    } catch (error) {
      console.error("Error calling API:", error);
    }
  };
  

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Enter Symptoms:</Text>
      <TextInput
        style={styles.input}
        placeholder="Type a phenotype"
        value={input}
        onChangeText={setInput}
      />
      <TouchableOpacity style={styles.button} onPress={() => translatePhenotype(input)}>
        <Text style={styles.buttonText}>Add</Text>
      </TouchableOpacity>


      {/* Show entered phenotypes */}
      {inputs.length > 0 && (
        <View style={styles.listContainer}>
          {inputs.map((item, index) => (
            <View key={index} style={styles.diseaseBubble}>
            <Text style={styles.bubbleText}>
              {index + 1}. {item} {" - "} {responseTexts[index]}
            </Text>
          </View>
          ))}
        {/* <Text style={styles.responseText}>{responseText}
        </Text>  */}
        </View>
      )}
      <TouchableOpacity style={styles.buttonSubmit} onPress={callPythonFunction}>
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const ResultScreen = ({ route, navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.resultText}>Top Disease Matches:</Text>
      <View style={styles.diseaseBubble} >
        <Text style={styles.bubbleText}>{"1. - "}{route.params.d5}{" - "}{route.params.s5}</Text>
      </View> <View style={styles.diseaseBubble} >
        <Text style={styles.bubbleText}>{"2. - "}{route.params.d4}{" - "}{route.params.s4}</Text>
      </View> <View style={styles.diseaseBubble} >
        <Text style={styles.bubbleText}>{"3. - "}{route.params.d3}{" - "}{route.params.s3}</Text>
      </View> <View style={styles.diseaseBubble} >
        <Text style={styles.bubbleText}>{"4. - "}{route.params.d2}{" - "}{route.params.s2}</Text>
      </View> <View style={styles.diseaseBubble} >
        <Text style={styles.bubbleText}>{"5. - "}{route.params.d1}{" - "}{route.params.s1}</Text>
      </View>
        <TouchableOpacity style={styles.buttonSubmit} onPress={() =>navigation.navigate("FinalScreen")}>
          <Text style={styles.buttonText}>Already Screened?</Text>
        </TouchableOpacity>
    </View>
  );
};

const FinalScreen = ({navigation}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.resultText}>You may have an unknown disease that is not part of our database. </Text>
      <Text style = {styles.listItem}> We've added you to our PhenoRare Diseases Network and your doctor will notify you as new research comes to light about your diagnosis</Text>
      {/* <TouchableOpacity style={styles.buttonSubmit} onPress={() =>navigation.navigate("HomeScreen")}>
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity> */}
    </View>
    
  )
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="ResultScreen" component={ResultScreen} />
        <Stack.Screen name="FinalScreen" component={FinalScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
const styles = {
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f9f7", // Light green-tinted background
    padding: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
    color: "#2c3e50",
    letterSpacing: 0.5,
  },
  subheading: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 12,
    color: "#34495e",
  },
  input: {
    width: "90%",
    padding: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#d1e7dd", // Light green border
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  button: {
    backgroundColor: "#4ade80", // Modern green
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonSubmit: {
    backgroundColor: "#10b981", // Darker green for submit
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  listContainer: {
    marginTop: 24,
    alignItems: "center",
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listItem: {
    fontSize: 16,
    marginVertical: 6,
    color: "#444",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    width: "100%",
  },
  resultText: {
    fontSize: 24,
    fontWeight: "700",
    marginVertical: 16,
    color: "#059669", // Emerald green for results
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    alignItems: "center",
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  badge: {
    backgroundColor: "#d1fae5", // Super light green
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginVertical: 8,
  },
  badgeText: {
    color: "#059669", // Emerald green
    fontWeight: "600",
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    width: "100%",
    marginVertical: 16,
  },
  
  // New Modern Bubble Style for Disease Outputs
  diseaseOutputContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 24,
  },
  diseaseBubble: {
    backgroundColor: "#10b981", // Bubble green
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
    margin: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  bubbleText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
};
