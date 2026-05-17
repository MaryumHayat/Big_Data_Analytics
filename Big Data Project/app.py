import os
import sys
from flask import Flask, render_template, request, jsonify

# Force environmental variable paths into active runtime memory lifecycle
os.environ["JAVA_HOME"] = r"C:\\Program Files\\Java\\jdk-17"
os.environ["SPARK_HOME"] = r"C:\\Users\\maryu\\anaconda3\\Lib\\site-packages\\pyspark"
os.environ["HADOOP_HOME"] = r"C:\\hadoop-3.4.1"

# Initialize findspark bootloader before calling Spark packages
import findspark
findspark.init(os.environ["SPARK_HOME"])

from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, DoubleType, IntegerType
from pyspark.ml.feature import VectorAssembler
from pyspark.ml.classification import RandomForestClassificationModel

app = Flask(__name__)

spark = None
rf_model = None

def init_spark_and_model():
    """Starts a clean local Spark context and loads the saved ML model weights once."""
    global spark, rf_model
    try:
        print("⚡ Bootstrapping background Big Data core engines...")
        spark = SparkSession.builder \
            .appName("AirQualityWebPortal") \
            .master("local[2]") \
            .config("spark.driver.bindAddress", "127.0.0.1") \
            .getOrCreate()
        
        model_path = "rf_air_quality_model_spark"
        if os.path.exists(model_path):
            rf_model = RandomForestClassificationModel.load(model_path)
            print(f"🏁 SUCCESS: Pre-trained Spark model loaded cleanly from '{model_path}'!")
        else:
            print(f"❌ CRITICAL ERROR: Could not locate model folder at '{model_path}'.")
    except Exception as e:
        print(f"❌ Framework initialization crash: {e}")

# Strict schema matching the features vectorized during your Spark ML training step
INPUT_SCHEMA = StructType([
    StructField('components_co', DoubleType(), True),
    StructField('components_no2', DoubleType(), True),
    StructField('components_o3', DoubleType(), True),
    StructField('components_pm2_5', DoubleType(), True),
    StructField('components_pm10', DoubleType(), True),
    StructField('components_so2', DoubleType(), True),
    StructField('temperature_2m', DoubleType(), True),
    StructField('relative_humidity_2m', DoubleType(), True),
    StructField('wind_speed_10m', DoubleType(), True),
    StructField('hour', IntegerType(), True),
    StructField('month', IntegerType(), True)
])

@app.route('/')
def home():
    """Serves the main application dashboard template."""
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    """Receives slider values, runs real-time Spark inference, and returns AQI status."""
    if not spark or not rf_model:
        return jsonify({"error": "The predictive AI model engine is offline."}), 500

    try:
        data = request.get_json()
        
        # Build structure matching your training features list
        user_input_tuple = (
            float(data.get('components_co', 0.0)),
            float(data.get('components_no2', 0.0)),
            float(data.get('components_o3', 0.0)),
            float(data.get('components_pm2_5', 0.0)),
            float(data.get('components_pm10', 0.0)),
            float(data.get('components_so2', 0.0)),
            float(data.get('temperature_2m', 25.0)),
            float(data.get('relative_humidity_2m', 50.0)),
            float(data.get('wind_speed_10m', 10.0)),
            int(data.get('hour', 12)),
            int(data.get('month', 5))
        )
        
        # Build raw single-row input Spark DataFrame stream
        single_row_df = spark.createDataFrame([user_input_tuple], schema=INPUT_SCHEMA)
        
        # Pack raw scalar features into Spark vector space representation
        features_to_vectorize = [
            'components_co', 'components_no2', 'components_o3', 'components_pm2_5', 
            'components_pm10', 'components_so2', 'temperature_2m', 
            'relative_humidity_2m', 'wind_speed_10m', 'hour', 'month'
        ]
        assembler = VectorAssembler(inputCols=features_to_vectorize, outputCol="features")
        vectorized_input = assembler.transform(single_row_df)
        
        # Execute forward model prediction pass
        prediction_output = rf_model.transform(vectorized_input)
        predicted_class = int(prediction_output.select("prediction").first()["prediction"])
        
        # Human-readable label indexing
        aqi_mapping = {
            1: {"label": "Good", "desc": "Air quality is satisfactory; minimal risk."},
            2: {"label": "Fair", "desc": "Acceptable quality; mild sensitivity triggers potential."},
            3: {"label": "Moderate", "desc": "Moderate pollution; group irritation warnings valid."},
            4: {"label": "Poor", "desc": "Unhealthy conditions; health warnings active."},
            5: {"label": "Hazardous", "desc": "Emergency state; everyone may experience serious effects."}
        }
        
        result_details = aqi_mapping.get(predicted_class, {"label": "Unknown", "desc": "Scale outside range boundaries."})
        
        return jsonify({
            "status": "success",
            "aqi_code": predicted_class,
            "aqi_label": result_details["label"],
            "aqi_desc": result_details["desc"]
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

if __name__ == '__main__':
    init_spark_and_model()
    print("\n🚀 Starting local portal development deployment server...")
    app.run(host='127.0.0.1', port=5000, debug=False)