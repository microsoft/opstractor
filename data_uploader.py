from genericpath import isdir
import os
from torch_opstractor import BinaryReader, OpNode
from typing import List
import argparse
from azure.kusto.data import KustoConnectionStringBuilder, KustoClient
from azure.kusto.data.data_format import DataFormat
from azure.kusto.ingest import (
    QueuedIngestClient,
    IngestionProperties
)
import pandas
import glob

parser = argparse.ArgumentParser(prog="Torch Opstractor Data Uploader",
                                 description="Parses output files from opstractor and uploads them to Azure Data Explorer.")
parser.add_argument("--path", type=str, help="Path containing data files",
                    default="./profiles")
parser.add_argument("--cluster", type=str,
                    help="Azure Data Explorer Cluster Name", required=True)
parser.add_argument("--database", type=str,
                    help="Azure Data Explorer database name", default="pytorch_ops")
parser.add_argument("--client_id", type=str,
                    help="ClientId to use to connect to database", required=True)
parser.add_argument("--client_secret", type=str,
                    help="Client secret to use to connect to database", required=True)
parser.add_argument("--tenant_id", type=str,
                    help="Tenant to use for authentication", required=True)

args = parser.parse_args()

files_to_parse = []
if not os.path.exists(args.path):
    raise Exception("Invalid path {path}")
elif os.path.isdir(args.path):
    files_to_parse = glob.glob(os.path.join(
        args.path, "*.bin"), recursive=True)
else:
    files_to_parse.append(args.path)

ingest_cluster = f"https://ingest-{args.cluster}.kusto.windows.net"

kcsb_ingest = KustoConnectionStringBuilder.with_aad_application_key_authentication(
    ingest_cluster, args.client_id, args.client_secret, args.tenant_id)

ingestion_client = QueuedIngestClient(kcsb_ingest)

cluster = f"https://{args.cluster}.kusto.windows.net"
kcsb = KustoConnectionStringBuilder.with_aad_application_key_authentication(
    cluster, args.client_id, args.client_secret, args.tenant_id)

mgmt_client = KustoClient(kcsb)

# create table
query = ".create table ModelOps (ModelName:string, OpName:string, OpSchema:string, Inputs: string, InvocationCount:int, TotalDuration_ns:long, NumberChildren:int, ChildrenDuration_ns: long, SequenceId: int, ParentPath: string)"
mgmt_client.execute_mgmt(args.database, query)

# reduce batch time span
query = ".alter table ModelOps policy  ingestionbatching '{\"MaximumBatchingTimeSpan\": \"00:00:30\"}'"
mgmt_client.execute_mgmt(args.database, query)

ingestion_props = IngestionProperties(
    database=args.database,
    table="ModelOps",
    data_format=DataFormat.CSV
    # in case status update for success are also required
    # report_level=ReportLevel.FailuresAndSuccesses,
    # in case a mapping is required
    # ingestion_mapping_reference="{json_mapping_that_already_exists_on_table}"
    # ingestion_mapping_type=IngestionMappingType.JSON
)

fields = ["ModelName", "OpName", "OpSchema", "Inputs", "InvocationCount",
          "TotalDuration_ns", "NumberChildren", "ChildrenDuration_ns", "SequenceId", "ParentPath"]


def processChildren(parent: OpNode, rows: List[OpNode], sequence_id: int):
    for opNode in parent.children:
        opNode.full_path = parent.full_path + str(sequence_id) + "/"
        children_total_duration_ms = sum(
            [x.cuml_total_duration_ns for x in opNode.children])
        row = [model, opNode.op_call.op.name, opNode.op_call.op.schema, opNode.op_call.inputs, opNode.invocation_count,
               opNode.cuml_total_duration_ns,
               len(opNode.children), children_total_duration_ms,
               sequence_id, parent.full_path]
        rows.append(row)
        sequence_id += 1
        sequence_id = processChildren(opNode, rows, sequence_id)

    return sequence_id


for f in files_to_parse:
    print(f'Working on model {f}')

    if os.path.getsize(f) == 0:
      print(f'Skipping {f} because its empty')
      continue

    rows = []
    reader = BinaryReader(open(f, mode="rb"))
    root = reader.read_op_node()
    sequence_id = 0

    root.full_path = "#/"
    model = root.op_call.op.name
    processChildren(root, rows, sequence_id)
    batch_size = 100000

    if len(rows) > 0:
        query = f'.show table ModelOps extents where tags has "drop-by:{model}"'
        response = mgmt_client.execute_mgmt(args.database, query)

        for existing in response.primary_results[0]:
            print(
                f"Dropping extent {existing['ExtentId']} with rows {existing['RowCount']}")
            query = f".drop extent {existing['ExtentId']} from ModelOps"
            mgmt_client.execute_mgmt(args.database, query)

        for x in range(0, len(rows), batch_size):
          print(f'Sending rows [{x}:{x + (batch_size-1)}]')
          df = pandas.DataFrame(data=rows[x:x + (batch_size - 1)], columns=fields)
          ingestion_props.drop_by_tags = [model]
          ingestion_client.ingest_from_dataframe(
              df, ingestion_properties=ingestion_props)

        print(f'Total rows sent: {len(rows)}')
    reader.close()
